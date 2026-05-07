<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $email = strtolower(trim($_POST['email'] ?? ''));
    $password = $_POST['password'] ?? '';
    $role = ($_POST['role'] ?? 'user') === 'admin' ? 'admin' : 'user';

    if ($name === '' || $email === '' || $password === '') {
        set_flash('error', 'All fields are required.');
        header('Location: register.php');
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        set_flash('error', 'Invalid email format.');
        header('Location: register.php');
        exit;
    }

    $users = users_collection();
    $existing = $users->findOne(['email' => $email]);
    if ($existing) {
        set_flash('error', 'Email already registered.');
        header('Location: register.php');
        exit;
    }

    $userDoc = [
        'name' => $name,
        'email' => $email,
        'password' => password_hash($password, PASSWORD_DEFAULT),
        'role' => $role,
        'created_at' => new MongoDB\BSON\UTCDateTime(),
    ];

    $insert = $users->insertOne($userDoc);
    $_SESSION['user'] = [
        'id' => (string) $insert->getInsertedId(),
        'name' => $name,
        'email' => $email,
        'role' => $role,
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
    <title>Register</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Create Account</h1>
        <p class="muted">Stores users in MongoDB: name, email, password, role.</p>

        <?php if ($flash): ?>
            <div class="flash <?= htmlspecialchars($flash['type']) ?>">
                <?= htmlspecialchars($flash['message']) ?>
            </div>
        <?php endif; ?>

        <form method="post" action="register.php">
            <div>
                <label for="name">Name</label>
                <input id="name" name="name" type="text" required>
            </div>

            <div>
                <label for="email">Email</label>
                <input id="email" name="email" type="email" required>
            </div>

            <div>
                <label for="password">Password</label>
                <input id="password" name="password" type="password" required minlength="6">
            </div>

            <div>
                <label for="role">Role</label>
                <select id="role" name="role">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                </select>
            </div>

            <button type="submit">Register</button>
        </form>

        <div class="links">
            <a href="login.php">Already have an account? Login</a>
        </div>
    </div>
</body>
</html>
