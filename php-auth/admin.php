<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

$user = require_role('admin');
$allUsers = users_collection()->find([], ['sort' => ['_id' => -1], 'limit' => 20])->toArray();
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Admin Dashboard</h1>
        <p>Welcome, <?= htmlspecialchars($user['name']) ?> (<?= htmlspecialchars($user['email']) ?>)</p>
        <p class="muted">Role: <?= htmlspecialchars($user['role']) ?></p>

        <div class="card-grid">
            <?php foreach ($allUsers as $u): ?>
                <div class="card">
                    <strong><?= htmlspecialchars((string) $u['name']) ?></strong><br>
                    <?= htmlspecialchars((string) $u['email']) ?><br>
                    <span class="muted">Role: <?= htmlspecialchars((string) $u['role']) ?></span>
                </div>
            <?php endforeach; ?>
        </div>

        <div class="links">
            <a href="logout.php">Logout</a>
        </div>
    </div>
</body>
</html>
