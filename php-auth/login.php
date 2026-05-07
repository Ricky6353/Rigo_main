<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = strtolower(trim($_POST['email'] ?? ''));
    $password = $_POST['password'] ?? '';

    if ($email === '' || $password === '') {
        set_flash('error', 'Email and password are required.');
        header('Location: login.php');
        exit;
    }

    $user = users_collection()->findOne(['email' => $email]);
    if (!$user || !password_verify($password, (string) ($user['password'] ?? ''))) {
        set_flash('error', 'Invalid credentials.');
        header('Location: login.php');
        exit;
    }

    $_SESSION['user'] = [
        'id' => (string) $user['_id'],
        'name' => (string) $user['name'],
        'email' => (string) $user['email'],
        'role' => (string) $user['role'],
    ];

    header('Location: dashboard.php');
    exit;
}

$flash = get_flash();
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Login</h1>
        <p class="muted">Session-based authentication with role redirect.</p>

        <?php if ($flash): ?>
            <div class="flash <?= htmlspecialchars($flash['type']) ?>">
                <?= htmlspecialchars($flash['message']) ?>
            </div>
        <?php endif; ?>

        <form method="post" action="login.php">
            <div>
                <label for="email">Email</label>
                <input id="email" name="email" type="email" required>
            </div>

            <div>
                <label for="password">Password</label>
                <input id="password" name="password" type="password" required>
            </div>

            <button type="submit">Login</button>
        </form>

        <div class="links">
            <a href="register.php">Need an account? Register</a>
        </div>
    </div>
</body>
</html>
