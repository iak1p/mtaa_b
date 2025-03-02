# Auth

## Login

```md
POST /auth/login
Content-Type: application/json;
```

Responses

```md
{
    "message": "Authorization successful",
    "token": "eyJhbGciOiJIUzI1..."
}
```

## Registration

```md
POST /auth/register
Content-Type: application/json
```

Responses

```md
{
    "message": "Registration successful",
    "token": "eyJhbGciOiJIUzI1..."
}
```

# Shared Accounts

## Get All Shared Accounts

```md
GET /shared-accounts/{user-id}
Authorization: Bearer {token}
```

Responses

```md
{
    "id": 1,
    name: "Example",
    "members": [123, 456, 789],
    "balance": 5000,
    "currency": "EUR",
    "created_at": "2024-02-01T10:00:00Z"
}
```

## Add transaction to Shared Account

```md
POST /shared-accounts/transaction/{transaction-id}
Content-Type: application/json
Authorization: Bearer {token}
```

Responses

```md
{
    "message": "Transaction added successfully",
}
```

## Delete transaction in Shared Account

```md
DELETE /shared-accounts/transaction/{transaction-id}
Content-Type: application/json
Authorization: Bearer {token}
```

Responses

```md
{
    "message": "Transaction deleted successfully",
}
```

## Change transaction in Shared Account

```md
PUT /shared-accounts/transaction/{transaction-id}
Content-Type: application/json
Authorization: Bearer {token}
```

Responses

```md
{
    "message": "Transaction added successfully",
}
```

# User

## Change photo

```md
PATCH /user/{user-id}/photo
Content-Type: application/json
Authorization: Bearer {token}
```

Responses

```md
{
    "message": "Changes are successful",
}
```

## Change currensy

```md
PATCH /user/{user-id}/currensy
Content-Type: application/json
Authorization: Bearer {token}
```

Responses

```md
{
    "message": "Changes are successful ",
}
```
