# Seguridad

## Diseño

- Sitio 100 % estático: sin servidor propio, sin base de datos, sin cuentas.
- No se recolectan datos personales. Nada sale del dispositivo, salvo pedir los archivos de la app.
- Sin recursos de terceros: todo se sirve desde el mismo dominio.
- Política de contenido estricta (`public/_headers`): solo scripts y estilos propios, sin código en línea, sin inclusión en otras páginas (iframes).
- La interfaz arma el contenido con `textContent`, nunca con `innerHTML`, para evitar inyección de código aun si un texto viniera alterado.

## Lista obligatoria para el administrador

- [ ] Verificación en dos pasos (2FA) en GitHub y en Cloudflare, con app o llave física (no SMS).
- [ ] Rama `main` protegida: cambios solo por *pull request* revisado; sin *force push*.
- [ ] Alertas de seguridad y Dependabot activados en GitHub.
- [ ] Ninguna contraseña, token ni clave dentro del repositorio.
- [ ] Revisar los accesos de colaboradores cada seis meses.
- [ ] Dominio con bloqueo de transferencia y renovación automática.

## Informar una vulnerabilidad

Escribir de forma privada al administrador del repositorio (pestaña *Security → Report a vulnerability* en GitHub). No abrir un *issue* público.
