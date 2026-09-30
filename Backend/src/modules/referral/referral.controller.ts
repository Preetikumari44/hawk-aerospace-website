import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/interfaces/current-user.interface';
import {
  CreateReferralCodeDto,
  CreateReferralInvitesDto,
  ReviewReferralDto,
  UpsertReferralRuleDto,
} from './dto/referral.dto';
import { ReferralRulesService } from './referral-rules.service';
import { ReferralService } from './referral.service';

@Controller('referrals')
export class ReferralController {
  constructor(
    private readonly referralService: ReferralService,
    private readonly rulesService: ReferralRulesService,
  ) {}

  /** Get-or-create my shareable code for a target role. */
  @Post('code')
  createCode(@Body() dto: CreateReferralCodeDto, @CurrentUser() user: CurrentUserType) {
    return this.referralService.getOrCreateCode(user, dto.targetRole);
  }

  /** Share via phone numbers (Case 1). Primary UX is on-device Share (free). */
  @Post('invites')
  createInvites(@Body() dto: CreateReferralInvitesDto, @CurrentUser() user: CurrentUserType) {
    return this.referralService.createInvites(user, dto);
  }

  /** My codes + funnel stats + wallet balance (powers Refer & Earn sheet). */
  @Get('my')
  my(@CurrentUser() user: CurrentUserType) {
    return this.referralService.myCodes(user);
  }

  /**
   * Attach a referral code after signup (e.g. user pastes it in the
   * Refer & Earn screen). Allowed only before any reward was earned for them.
   */
  @Post('attach')
  async attach(
    @Body() dto: { code: string },
    @CurrentUser() user: CurrentUserType,
  ) {
    const code = String(dto?.code ?? '').toUpperCase().trim();
    if (!code) throw new BadRequestException('code is required.');
    await this.referralService.handleSignedUp(user.uid, user.phone ?? undefined, code);
    return { attached: true, code };
  }

  /**
   * Public resolver for https://hawkaerosystem.com/r/:code
   * (landing page + app deep link call this; no auth so invitees can open it).
   */
  @Public()
  @Get('resolve/:code')
  resolve(@Param('code') code: string) {
    return this.referralService.resolve(code);
  }

  /**
   * Human landing page for /r/:code invite links (served directly as the
   * short-URL fallback, with app logo + Open Graph tags for link previews).
   * Open-in-app + Download APK buttons; code shown big for manual entry
   * (needed while off Play Store).
   */
  @Public()
  @Get('landing/:code')
  async landing(@Param('code') code: string, @Res() res: Response) {
    let data: Awaited<ReturnType<ReferralService['resolve']>> | null = null;
    try {
      data = await this.referralService.resolve(code);
    } catch {
      data = null;
    }
    const safe = (s: string) => s.replace(/[<>&"]/g, '');
    const headline = data
      ? `${safe(String(data.inviter))} invited you to Hawk Aerosystem`
      : 'Invalid or expired Hawk invite';
    const sub = data
      ? `Join as <b>${safe(data.targetRoles.join(' / '))}</b> and enter code <b>${safe(data.code)}</b> at signup.`
      : 'Ask your inviter for a fresh link.';
    const apkBase =
      process.env.PUBLIC_API_BASE ?? 'http://43.205.190.95:3000';
    const logoUrl = `${apkBase}/files/logo.png`;
    const ogTitle = data
      ? `${data.inviter} invited you to Hawk Aerosystem (${data.targetRoles.join('/')})`
      : 'Hawk Aerosystem — Refer & Earn';
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Hawk Aerosystem — Refer & Earn</title>
<meta property="og:title" content="${safe(ogTitle)}"/>
<meta property="og:description" content="Install the Hawk app and enter referral code ${data ? safe(data.code) : ''} to join."/>
<meta property="og:image" content="${logoUrl}"/>
<meta property="og:type" content="website"/>
<meta name="twitter:card" content="summary"/>
<style>body{font-family:system-ui,sans-serif;background:#0b1220;color:#fff;display:flex;min-height:100vh;margin:0;align-items:center;justify-content:center;padding:24px} .card{max-width:480px;width:100%;background:#111c33;border:1px solid #22345f;border-radius:16px;padding:28px;text-align:center} .logo{width:72px;height:72px;border-radius:18px} .code{font-size:28px;letter-spacing:2px;background:#0b1220;border:1px dashed #4c6cb3;border-radius:10px;padding:12px;margin:16px 0} a.btn{display:block;margin:10px 0;padding:14px;border-radius:10px;text-decoration:none;font-weight:700} .primary{background:#f5a623;color:#111} .ghost{border:1px solid #4c6cb3;color:#fff} small{color:#9fb2d8}</style>
</head><body><div class="card">
<img class="logo" src="${logoUrl}" alt="Hawk Aerosystem logo"/>
<h2>Hawk Aerosystem</h2><h3>${headline}</h3><p>${sub}</p>
${data ? `<div class="code">${safe(data.code)}</div>
<a class="btn primary" href="hawk://invite?code=${encodeURIComponent(safe(data.code))}">Open in app</a>
<a class="btn ghost" href="${apkBase}/api/update/d/${encodeURIComponent(safe(data.code))}">⬇ Download app directly</a>
<a class="btn ghost" href="${apkBase}/api/update/latest?ref=${encodeURIComponent(safe(data.code))}">Check version info</a>
<small>After install: sign up with OTP, paste the code when asked for a referral code. Customer rewards credit after your first <b>paid</b> service (cash counts once the pilot confirms receipt).</small>` : `<small>This link is invalid or expired.</small>`}
</div></body></html>`;
    // res.send bypasses the global TransformInterceptor so browsers get raw HTML.
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  // ── Admin ───────────────────────────────────────────────────────

  @Get('admin/list')
  @Roles('admin', 'super_admin', 'subadmin', 'state_admin', 'dept_admin')
  adminList(@Query('status') status?: string, @Query('limit') limit?: string) {
    return this.referralService.adminList(status, limit ? Number(limit) : 50);
  }

  @Patch('admin/:id')
  @Roles('admin', 'super_admin', 'subadmin', 'state_admin', 'dept_admin')
  adminReview(@Param('id') id: string, @Body() dto: ReviewReferralDto) {
    return this.referralService.voidReferral(id, (dto as { reason?: string }).reason);
  }

  @Get('admin/rules')
  @Roles('admin', 'super_admin', 'subadmin', 'state_admin', 'dept_admin')
  adminRules() {
    return this.rulesService.list();
  }

  @Post('admin/rules')
  @Roles('admin', 'super_admin', 'subadmin', 'state_admin', 'dept_admin')
  upsertRule(@Body() dto: UpsertReferralRuleDto) {
    return this.rulesService.upsert(dto);
  }
}
