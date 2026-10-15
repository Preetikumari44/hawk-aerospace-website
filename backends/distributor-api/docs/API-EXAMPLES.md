# API examples

Base URL for local development: `http://localhost:8080`

The examples use bash line continuations (`\`). On Windows PowerShell use `curl.exe` (not the `curl` alias) and the backtick (`` ` ``) for line continuation — see the top-level README for a PowerShell version.

## Valid submission (repeat `models[]` for each model)
```bash
curl -i -X POST http://localhost:8080/api/distributor/applications \
  -H 'Origin: http://localhost:3000' \
  -F country='India' -F city='Bengaluru' \
  -F 'models[]=H32X (10L)' -F 'models[]=H120 (50L)' \
  -F companyName='Acme Agro Pvt Ltd' -F website='www.acme-agro.com' \
  -F businessType='Drone Dealer' -F turnover='€1m - €5m' \
  -F name='Asha Rao' -F jobTitle='Director' -F email='asha@acme-agro.com' \
  -F countryCode='+91' -F phone='98765 43210' \
  -F brands='None' -F message='We would like to distribute Hawk drones in Karnataka.' \
  -F 'file=@./company-profile.pdf;type=application/pdf'
```
→ `HTTP/1.1 201` `{"success":true,"message":"Your distributor application was submitted successfully.","applicationId":"…","notificationStatus":"SENT"}`

## Missing required fields → 400
```bash
curl -i -X POST http://localhost:8080/api/distributor/applications -F country='India' -F email='bad'
```
→ `400` `{"success":false,"message":"Enter your city or region. (and 4 more field problems)","code":"VALIDATION_FAILED","errors":[{"field":"city",…},…]}`

## Wrong / fake file → 400
```bash
echo "not a pdf" > fake.pdf
curl -i -X POST http://localhost:8080/api/distributor/applications <same -F fields as above> -F 'file=@fake.pdf'
```
→ `400` `"code":"FILE_CONTENT_MISMATCH"`; a `.exe` gives `UNSUPPORTED_FILE_TYPE`; > 10 MB gives `FILE_TOO_LARGE`.

## CORS preflight
```bash
curl -i -X OPTIONS http://localhost:8080/api/distributor/applications \
  -H 'Origin: http://localhost:3000' -H 'Access-Control-Request-Method: POST'
```
→ `Access-Control-Allow-Origin: http://localhost:3000`. Any other origin → `403`.

## No public read
```bash
curl -i http://localhost:8080/api/distributor/applications          # 401
```

## Admin (HTTP Basic, needs ADMIN_PASSWORD_HASH configured)
```bash
curl -u admin:YOUR-PASSWORD 'http://localhost:8080/api/admin/distributor/applications?page=0&size=20'
curl -u admin:YOUR-PASSWORD http://localhost:8080/api/admin/distributor/applications/<id>
curl -u admin:YOUR-PASSWORD -X PATCH -H 'Content-Type: application/json' \
     -d '{"status":"IN_REVIEW"}' http://localhost:8080/api/admin/distributor/applications/<id>/status
curl -u admin:YOUR-PASSWORD -OJ http://localhost:8080/api/admin/distributor/applications/<id>/document
```

## Verify persistence (MySQL)
```powershell
docker compose exec mysql mysql -uhawk_app -p hawk_distributor -e "select id, company_name, status, notification_status from distributor_applications order by submitted_at desc limit 5; select * from distributor_application_models;"
```

## Health
```bash
curl http://localhost:8080/actuator/health        # {"status":"UP"}
```
