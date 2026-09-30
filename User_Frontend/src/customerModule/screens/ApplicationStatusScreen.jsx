import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';

import CheckIcon from '../assets/Icons_V02/Icons/CheckIcon.svg';
import ArrowBackwardIcon from '../assets/Icons_V02/Icons/ArrowBackwardIcon.svg';
import { useLanguage } from '../../i18n';
import { roleApplicationsApi } from '../../utils/api';
import { getRoleApplicationConfig, frontendRoleFromBackend } from '../../commonScreens/roleApplicationConfig';
import { useTabBarPadding } from '../../utils/responsive';

/**
 * Displays a role-application's live status straight from the backend.
 * - routeParams.role: the role being inspected (frontend role id). When omitted
 *   the most recent application across all roles is shown.
 * - If status/reason are provided (e.g. pushed by a socket event) they are used
 *   as an instant overlay while the backend fetch confirms.
 */
const ApplicationStatusScreen = ({ onNavigate, onSwitchRole, routeParams }) => {
  const { t } = useLanguage();
  const tabBarPadding = useTabBarPadding();
  const requestedRole = routeParams?.role || null;
  const [appliedRole, setAppliedRole] = useState(requestedRole || 'pilot');

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const config = getRoleApplicationConfig(appliedRole);

  // Instant snapshot from the realtime event (keeps rejection/approval visible
  // the moment admin decides), otherwise fall back to what the backend knows.
  const instantStatus = routeParams?.status || null;
  const instantReason = routeParams?.reason || null;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        let app = null;
        if (requestedRole) {
          app = await roleApplicationsApi.getMyApplicationForRole(requestedRole);
        } else {
          const apps = await roleApplicationsApi.getMyApplications();
          app = (Array.isArray(apps) && apps.length > 0 ? apps[0] : null) || null;
        }
        if (!alive) return;
        setApplication(app || null);
        if (app && !requestedRole) {
          const frontendRole = frontendRoleFromBackend(app.role);
          if (frontendRole) setAppliedRole(frontendRole);
        }
      } catch (err) {
        console.error('Failed to fetch application status', err);
        if (alive) setError(err?.message || 'Failed to load status');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [requestedRole]);

  const status = application?.status || instantStatus || 'pending';
  const reason = application?.rejectionReason || application?.remarks || instantReason || null;

  const statusDetails = useMemo(() => {
    switch (status) {
      case 'approved':
        return { text: 'Admin Approval Received', color: '#059669' };
      case 'rejected':
        return { text: 'Application Rejected', color: '#DC2626' };
      default:
        return { text: 'Pending Admin Approval', color: '#374151' };
    }
  }, [status]);

  const fieldsToShow = useMemo(() => {
    if (!config || !application?.formData) return [];
    return config.fields
      .filter((f) => f.key !== '_docNumberSource' && application.formData[f.key])
      .map((f) => ({ label: f.label, value: application.formData[f.key] }));
  }, [config, application]);

  const handleApplyAgain = () => onNavigate('RoleApplicationFormScreen', { role: appliedRole });
  const handleSwitchNow = () => {
    if (onSwitchRole) {
      onSwitchRole(appliedRole);
    } else {
      Alert.alert(t('Switch Role'), t('You can switch to this role from the Accounts screen.'));
    }
  };

  if (loading) {
    return (
      <ScreenContainer backgroundColor="#FAFAFA">
        <View style={styles.header}>
          <Pressable onPress={() => onNavigate('Back')}>
            <ArrowBackwardIcon width={28} height={28} />
          </Pressable>
          <Text style={styles.heading}>{t('Application Status')}</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer backgroundColor="#FAFAFA">
      <View style={styles.header}>
        <Pressable onPress={() => onNavigate('Back')}>
          <ArrowBackwardIcon width={28} height={28} />
        </Pressable>
        <Text style={styles.heading}>{t('Application Status')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarPadding }]}>
        <View style={styles.statusHeaderBlock}>
          <Text style={styles.statusLabel}>{t('Application Status:')}</Text>
          <Text style={[styles.statusValue, { color: statusDetails.color }]}>{t(statusDetails.text)}</Text>

          {status === 'approved' && (
            <Text style={styles.statusMessage}>
              {t(
                'Congratulations. Your Application is Successful. You can now access {{role}} by switching your role from the Accounts screen.',
                { role: t(config?.title || 'the new role') },
              )}
            </Text>
          )}

          {status === 'rejected' && (
            <Text style={styles.statusMessage}>
              <Text style={{ color: '#6B7280' }}>{t('Rejection Reason: ')}</Text>
              {reason ? t(reason) : t('Your application did not meet the requirements.')}
            </Text>
          )}

          {status === 'pending' && (
            <Text style={styles.statusMessage}>
              {t(
                'Your application is with our admin team. You will be notified the moment a decision is made.',
              )}
            </Text>
          )}
        </View>

        {error && <Text style={styles.errorText}>Error: {error}</Text>}

        {!application && !routeParams?.status && !error && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{t('No Application Found')}</Text>
            <Text style={styles.subText}>
              {t('You have not applied for the {{role}} role yet.', { role: t(config?.title || appliedRole) })}
            </Text>
            <Pressable style={styles.applyBtn} onPress={handleApplyAgain}>
              <Text style={styles.applyBtnText}>{t('Apply Now')}</Text>
            </Pressable>
          </View>
        )}

        {((application && status) || routeParams?.status) && (
          <>
            <Text style={styles.sectionTitle}>{t('Application for the Role of')}</Text>
            <View style={styles.roleCard}>
              <View style={styles.roleTextBlock}>
                <Text style={styles.roleTitleBold}>{t(config?.title || appliedRole)}</Text>
                <Text style={styles.roleDescription}>{t('Application submitted on')}{' '}
                  {application?.submittedAt
                    ? new Date(application.submittedAt).toLocaleString()
                    : '-'}
                </Text>
              </View>
            </View>

            {fieldsToShow.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t('Submitted Details')}</Text>
                {fieldsToShow.map((field, index) => (
                  <View key={`${field.label}-${index}`} style={styles.inputWrapper}>
                    <Text style={styles.label}>{t(field.label)}</Text>
                    <Text style={styles.input}>{String(field.value)}</Text>
                  </View>
                ))}
              </>
            )}

            {application?.documents && Array.isArray(application.documents) && application.documents.length > 0 ? (
              <>
                <Text style={styles.sectionTitleBlack}>{t('Documents')}</Text>
                <Text style={styles.boldLabel}>{t('Documents Submitted:')}</Text>
                {application.documents.map((doc, idx) => {
                  const source = application?.formData?._docNumberSource?.[doc.type];
                  return (
                    <View key={`${doc.type}-${idx}`} style={styles.submittedDocCard}>
                      <View style={styles.submittedDocRow}>
                        <CheckIcon width={20} height={20} />
                        <Text style={styles.docText}>{doc.name || doc.type}</Text>
                      </View>
                      {doc.number ? (
                        <Text style={styles.docNumberValue}>
                          {t('Document No:')} {String(doc.number)}
                          {source === 'auto' ? ` ${t('(auto-read)')}` : ''}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </>
            ) : config && config.documents.length > 0 && (
              <>
                <Text style={styles.sectionTitleBlack}>{t('Documents')}</Text>
                <Text style={styles.boldLabel}>{t('Documents Submitted:')}</Text>
                {config.documents.map((doc) => (
                  <View key={doc.key} style={styles.docRow}>
                    <CheckIcon width={20} height={20} />
                    <Text style={styles.docText}>
                      {t(doc.label)} {doc.required && <Text style={styles.asterisk}>*</Text>}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {status === 'rejected' && (
              <Pressable style={styles.applyBtn} onPress={handleApplyAgain}>
                <Text style={styles.applyBtnText}>{t('Apply Again')}</Text>
              </Pressable>
            )}
            {status === 'approved' && (
              <Pressable style={styles.applyBtn} onPress={handleSwitchNow}>
                <Text style={styles.applyBtnText}>
                  {t('Switch to {{role}}', { role: t(config?.title || appliedRole) })}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  heading: {
    marginLeft: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#2F3542',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  center: {
    paddingTop: 120,
    alignItems: 'center',
  },
  statusHeaderBlock: {
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  statusMessage: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitleBlack: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
  },
  roleTextBlock: {
    flex: 1,
  },
  roleTitleBold: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  subText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  boldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 6,
    fontWeight: '500',
  },
  asterisk: {
    color: '#EF4444',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  submittedDocCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  submittedDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  docNumberValue: {
    marginLeft: 28,
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
  },
  docText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#4B5563',
  },
  applyBtn: {
    backgroundColor: '#4F46E5',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ApplicationStatusScreen;
