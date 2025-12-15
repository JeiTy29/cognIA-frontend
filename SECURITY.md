cat > SECURITY.md <<'EOF'
# Security notes
- Tokens: access token short-lived; refresh token almacenado en HttpOnly cookie.
- HTTPS: producción con Vercel/Netlify o Certbot para VPS.
- No almacenar secretos en el repositorio.
EOF
