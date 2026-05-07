<?php

declare(strict_types=1);

use MongoDB\Client;

require_once __DIR__ . '/vendor/autoload.php';

$config = require __DIR__ . '/config.php';

session_name($config['session_name']);
session_start();

function app_config(): array
{
    global $config;
    return $config;
}

function mongo_client(): Client
{
    static $client = null;

    if ($client === null) {
        $cfg = app_config();
        $client = new Client($cfg['mongo_uri']);
    }

    return $client;
}

function users_collection(): MongoDB\Collection
{
    $cfg = app_config();
    return mongo_client()
        ->selectDatabase($cfg['database'])
        ->selectCollection($cfg['users_collection']);
}

function current_user(): ?array
{
    return $_SESSION['user'] ?? null;
}

function require_auth(): array
{
    $user = current_user();
    if (!$user) {
        header('Location: login.php');
        exit;
    }
    return $user;
}

function require_role(string $role): array
{
    $user = require_auth();
    if (($user['role'] ?? '') !== $role) {
        header('Location: dashboard.php');
        exit;
    }
    return $user;
}

function set_flash(string $type, string $message): void
{
    $_SESSION['flash'] = [
        'type' => $type,
        'message' => $message,
    ];
}

function get_flash(): ?array
{
    if (!isset($_SESSION['flash'])) {
        return null;
    }
    $flash = $_SESSION['flash'];
    unset($_SESSION['flash']);
    return $flash;
}
