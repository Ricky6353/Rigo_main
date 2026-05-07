<?php

declare(strict_types=1);

return [
    // Replace with your MongoDB Atlas URI.
    'mongo_uri' => 'mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority',
    'database' => 'rigo',
    'users_collection' => 'users',
    'session_name' => 'rigo_php_auth',
];
