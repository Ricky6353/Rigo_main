# PHP + MongoDB Auth Module

This folder contains a login and registration system in PHP using MongoDB.

## Features

- User registration with `name`, `email`, `password`, `role`
- Password hashing (`password_hash` / `password_verify`)
- Session authentication
- Role-based dashboards:
  - `admin.php` for admins
  - `user.php` for users

## Prerequisites

- PHP 8.1+
- Composer
- MongoDB PHP extension (`ext-mongodb`) enabled
- MongoDB Atlas cluster (or local MongoDB)

## Install

```bash
cd php-auth
composer install
```

## Configure

Edit `config.php`:

- `mongo_uri`: MongoDB Atlas connection string
- `database`: database name (e.g. `rigo`)
- `users_collection`: usually `users`

## Run

```bash
cd php-auth
php -S localhost:8080
```

Then open [http://localhost:8080](http://localhost:8080).

## File map

- `register.php`: registration
- `login.php`: login
- `dashboard.php`: role redirect
- `admin.php`: admin dashboard
- `user.php`: user dashboard
- `logout.php`: logout/session destroy
- `bootstrap.php`: DB/session helpers
