#!/bin/bash

# URL base de la API
BASE_URL="http://localhost:3000/auth"

# Datos de prueba
LOGIN_DATA='{"email":"test@example.com","password":"test123"}'
REGISTER_DATA='{"email":"user@example.com","password":"pass123","name":"Test User"}'

# Función para hacer peticiones
make_request() {
    local endpoint=$1
    local data=$2
    local response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/${endpoint}" \
        -H "Content-Type: application/json" \
        -d "${data}")
    
    # Extraer el código de estado y la respuesta
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    echo "Status: $http_code"
    echo "Response: $body"
    echo "-------------------"
}

# Probar rate limit en login
echo "Probando rate limit en /auth/login..."
for i in {1..110}; do
    echo "Login Request #$i"
    make_request "login" "$LOGIN_DATA"
    sleep 0.1
done

# Esperar un momento antes de probar register
sleep 2

# Probar rate limit en register
echo "Probando rate limit en /auth/register..."
for i in {1..110}; do
    echo "Register Request #$i"
    make_request "register" "$REGISTER_DATA"
    sleep 0.1
done 