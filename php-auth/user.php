<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

$user = require_role('user');
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Dashboard</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>User Dashboard</h1>
        <p>Welcome, <?= htmlspecialchars($user['name']) ?>.</p>
        <p class="muted">Email: <?= htmlspecialchars($user['email']) ?></p>
        <p class="muted">Role: <?= htmlspecialchars($user['role']) ?></p>

        <div class="card">
            You are authenticated using PHP sessions and MongoDB user records.
        </div>

        <div class="links">
            <a href="logout.php">Logout</a>
        </div>
    </div>
</body>
</html>
