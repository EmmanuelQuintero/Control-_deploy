$ts = (Get-Date).ToString('yyyyMMddHHmmss')
$email = "testuser_$ts@example.com"
$pwd = 'TestPass123!'
$register = @{ nombre = 'Prueba'; apellido = 'Tester'; email = $email; contraseña = $pwd } | ConvertTo-Json -Compress
try {
  $r = Invoke-RestMethod -Uri 'http://localhost:5001/api/register' -Method Post -Body $register -ContentType 'application/json' -ErrorAction Stop
  Write-Host "REGISTER_RESPONSE:"
  $r | ConvertTo-Json -Compress | Write-Host
  $id = $r.user.id_usuario
  # Login
  $login = @{ email = $email; contraseña = $pwd } | ConvertTo-Json -Compress
  $l = Invoke-RestMethod -Uri 'http://localhost:5001/api/login' -Method Post -Body $login -ContentType 'application/json' -ErrorAction Stop
  Write-Host "LOGIN_RESPONSE:"
  $l | ConvertTo-Json -Compress | Write-Host
  # Registrar sueño dos veces (misma fecha) para probar dedupe
  $date = '2025-10-27'
  $s1 = @{ id_usuario = $id; fecha = $date; horas_dormidas = 6 } | ConvertTo-Json -Compress
  $res1 = Invoke-RestMethod -Uri 'http://localhost:5001/api/sleep' -Method Post -Body $s1 -ContentType 'application/json' -ErrorAction Stop
  Write-Host "SLEEP_POST_1:"
  $res1 | ConvertTo-Json -Compress | Write-Host
  Start-Sleep -Milliseconds 500
  $s2 = @{ id_usuario = $id; fecha = $date; horas_dormidas = 6.2 } | ConvertTo-Json -Compress
  $res2 = Invoke-RestMethod -Uri 'http://localhost:5001/api/sleep' -Method Post -Body $s2 -ContentType 'application/json' -ErrorAction Stop
  Write-Host "SLEEP_POST_2:"
  $res2 | ConvertTo-Json -Compress | Write-Host
  Start-Sleep -Seconds 1
  Write-Host "GET_NOTIFICATIONS_BEFORE_EMAIL:"
  $notifs = Invoke-RestMethod -Uri "http://localhost:5001/api/notifications/$id" -UseBasicParsing -ErrorAction Stop
  $notifs | ConvertTo-Json -Compress | Write-Host
  # Intentar enviar email desde admin endpoint al usuario creado
  $emailPayload = @{ userIds = @($id); message = "Prueba de correo desde admin (entrega)."; subject = "Prueba Admin Email" } | ConvertTo-Json -Compress
  try {
    $send = Invoke-RestMethod -Uri 'http://localhost:5001/api/admin/send-email-notification' -Method Post -Body $emailPayload -ContentType 'application/json' -ErrorAction Stop
    Write-Host "ADMIN_SEND_EMAIL_RESPONSE:"
    $send | ConvertTo-Json -Compress | Write-Host
  } catch {
    Write-Host "ADMIN_SEND_EMAIL_ERROR:"
    if ($_.Exception.Response) { $msg = $_.Exception.Response.StatusCode.Value__ } else { $msg = $_.Exception.Message }
    Write-Host $msg
  }
  Start-Sleep -Seconds 1
  Write-Host "GET_NOTIFICATIONS_AFTER_EMAIL:"
  $notifs2 = Invoke-RestMethod -Uri "http://localhost:5001/api/notifications/$id" -UseBasicParsing -ErrorAction Stop
  $notifs2 | ConvertTo-Json -Compress | Write-Host
} catch {
  Write-Host 'ERROR-STEP:'
  if ($_.Exception.Response) { $msg = $_.Exception.Response.StatusCode.Value__ } else { $msg = $_.Exception.Message }
  Write-Host $msg
}