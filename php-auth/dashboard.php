<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

$user = require_auth();
if (($user['role'] ?? '') === 'admin') {
    header('Location: admin.php');
    exit;
}
header('Location: user.php');
exit;
