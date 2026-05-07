<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

$user = current_user();
if ($user) {
    header('Location: dashboard.php');
    exit;
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP Auth Home</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Login and Registration (PHP + MongoDB)</h1>
        <p class="muted">Use registration and login with role-based dashboards.</p>
        <div class="links">
            <a href="register.php">Create account</a> | <a href="login.php">Login</a>
        </div>
    </div>
</body>
</html>
