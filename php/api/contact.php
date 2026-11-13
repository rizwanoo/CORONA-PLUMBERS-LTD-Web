<?php
declare(strict_types=1);

/**
 * CORONA PLUMBERS LTD — PHP 8+ Quote Request Endpoint
 * Provides CSRF verification, honeypot spam protection, input sanitisation,
 * validation, and environment-configured SMTP delivery.
 */

session_start();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    echo json_encode(['csrfToken' => $_SESSION['csrf_token']]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '', true);
if (!is_array($data)) {
    $data = $_POST;
}

$headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($data['_csrf'] ?? '');
$sessionToken = $_SESSION['csrf_token'] ?? '';
if (!$sessionToken || !hash_equals($sessionToken, (string) $headerToken)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Invalid security token. Please reload the page.']);
    exit;
}

// Honeypot check
$honeypot = trim((string) ($data['website_url'] ?? ''));
if ($honeypot !== '') {
    echo json_encode(['ok' => true, 'referenceId' => 'CPL-RECEIVED']);
    exit;
}

$sanitize = static function (mixed $val, int $max): string {
    $clean = preg_replace('/[\x00-\x1F\x7F]/u', ' ', (string) $val) ?? '';
    $clean = strip_tags(trim($clean));
    return mb_substr($clean, 0, $max, 'UTF-8');
};

$name = $sanitize($data['name'] ?? '', 100);
$phone = $sanitize($data['phone'] ?? '', 30);
$email = strtolower($sanitize($data['email'] ?? '', 140));
$postcode = strtoupper($sanitize($data['postcode'] ?? '', 16));
$service = $sanitize($data['service'] ?? '', 80);
$preferredContact = $sanitize($data['preferredContact'] ?? '', 40);
$message = $sanitize($data['message'] ?? '', 2000);

$errors = [];
if (mb_strlen($name) < 2) {
    $errors['name'] = 'Please enter your full name.';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Please enter a valid email address.';
}
if (!preg_match('/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i', $postcode)) {
    $errors['postcode'] = 'Please enter a valid UK property postcode.';
}
if ($phone !== '' && !preg_match('/^[+\d\s()-]{7,20}$/', $phone)) {
    $errors['phone'] = 'Please enter a valid telephone number.';
}
if ($preferredContact === 'Telephone' && mb_strlen($phone) < 7) {
    $errors['phone'] = 'Please provide a telephone number for a call back.';
}
if (mb_strlen($message) < 10) {
    $errors['message'] = 'Please describe the plumbing work required.';
}

if ($errors !== []) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => 'Please check the highlighted fields.',
        'fieldErrors' => $errors,
    ]);
    exit;
}

$referenceId = 'CPL-' . strtoupper(bin2hex(random_bytes(3)));
$recipient = getenv('QUOTE_RECIPIENT_EMAIL') ?: '';
$smtpFrom = getenv('SMTP_FROM') ?: '';

if ($recipient !== '' && filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
    $subject = sprintf('Quote Request [%s] — %s (%s)', $referenceId, $service, $postcode);
    $body = "CORONA PLUMBERS LTD — Quote Request\n"
        . "Reference: {$referenceId}\n"
        . "Name: {$name}\n"
        . "Email: {$email}\n"
        . "Phone: {$phone}\n"
        . "Postcode: {$postcode}\n"
        . "Service: {$service}\n"
        . "Preferred Contact: {$preferredContact}\n\n"
        . "Message:\n{$message}\n";

    $headers = [
        'Content-Type: text/plain; charset=UTF-8',
        'Reply-To: ' . $email,
    ];
    if ($smtpFrom !== '') {
        $headers[] = 'From: ' . $smtpFrom;
    }

    @mail($recipient, $subject, $body, implode("\r\n", $headers));
}

echo json_encode([
    'ok' => true,
    'referenceId' => $referenceId,
    'message' => "Thank you, {$name}. Your quote request ({$referenceId}) has been logged.",
]);
