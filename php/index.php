<?php
// PHP client for the Darija Translator REST API: one form, plain cURL, no Composer.
// Run: php -S localhost:8000   (from this folder; needs the curl extension)

declare(strict_types=1);

const TIMEOUT_SECONDS = 40; // a little longer than the server's own 30 s LLM timeout
const MAX_LENGTH = 5000;

/** Escapes text for HTML output. Everything shown on the page goes through this. */
function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Number of characters (not bytes) in a UTF-8 string; works without the mbstring extension. */
function char_count(string $value): int
{
    return (int) preg_match_all('/./su', $value);
}

function load_config(): array
{
    $file = __DIR__ . '/config.php';
    if (!is_file($file)) {
        throw new RuntimeException('Missing php/config.php: copy config.example.php to config.php and fill it in.');
    }
    return require $file;
}

function error_message(int $status, string $serverMessage, string $apiUrl): string
{
    return match ($status) {
        400 => $serverMessage !== '' ? $serverMessage : 'The server rejected the request.',
        401 => 'Wrong username or password. Check php/config.php.',
        404 => "No translation API at $apiUrl. Check api_url in php/config.php.",
        429 => 'The translation service is busy (rate limit). Wait a moment and try again.',
        502 => ($serverMessage !== '' ? $serverMessage : 'The translation model is unavailable right now.')
            . ' Try again in a moment.',
        default => $serverMessage !== '' ? $serverMessage : "Unexpected server response (HTTP $status).",
    };
}

/** Calls POST /api/translate. Returns the translation, or throws RuntimeException with a user-facing message. */
function translate(array $config, string $text, string $script): string
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('The PHP curl extension is not enabled (see the README, "PHP client").');
    }

    $apiUrl = rtrim($config['api_url'], '/');
    $curl = curl_init($apiUrl . '/api/translate');
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['text' => $text, 'script' => $script], JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
        CURLOPT_USERPWD => $config['username'] . ':' . $config['password'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => TIMEOUT_SECONDS,
    ]);

    $body = curl_exec($curl);
    if ($body === false) {
        throw new RuntimeException(curl_errno($curl) === CURLE_OPERATION_TIMEDOUT
            ? 'The server took too long to answer. Try again.'
            : "Server not reachable at $apiUrl. Is it running?");
    }

    $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $data = json_decode($body, true);
    if ($status === 200 && is_array($data) && isset($data['translation'])) {
        return $data['translation'];
    }
    $serverMessage = is_array($data) && is_string($data['error'] ?? null) ? $data['error'] : '';
    throw new RuntimeException(error_message($status, $serverMessage, $apiUrl));
}

// ------------------------------------------------------------------ request handling

$text = '';
$script = 'arabic';
$translation = null;
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $text = trim((string) ($_POST['text'] ?? ''));
    $script = ($_POST['script'] ?? '') === 'latin' ? 'latin' : 'arabic';

    if ($text === '') {
        $error = 'Type some text first.';
    } elseif (!preg_match('//u', $text)) {
        $error = 'The text is not valid UTF-8.';
    } elseif (char_count($text) > MAX_LENGTH) {
        $error = 'The text is too long (' . char_count($text) . ' characters, maximum ' . MAX_LENGTH . ').';
    } else {
        try {
            $translation = translate(load_config(), $text, $script);
        } catch (RuntimeException $exception) {
            $error = $exception->getMessage();
        }
    }
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Darija Translator (PHP)</title>
    <style>
        :root { color-scheme: light dark; --accent: #c1272d; --muted: #6b6b73; --border: #d0d0d6; }
        body { max-width: 640px; margin: 2rem auto; padding: 0 1rem; font: 16px/1.5 system-ui, "Segoe UI", sans-serif; }
        h1 { margin-bottom: 0.25rem; }
        p.sub { margin-top: 0; color: var(--muted); }
        label { display: block; font-weight: 600; margin: 1rem 0 0.25rem; }
        textarea { width: 100%; min-height: 8rem; padding: 0.5rem; font: inherit; box-sizing: border-box;
                   border: 1px solid var(--border); border-radius: 6px; }
        fieldset { border: none; padding: 0; margin: 0.75rem 0; }
        button { margin-top: 0.5rem; padding: 0.5rem 1.25rem; font: inherit; font-weight: 600; color: #fff;
                 background: var(--accent); border: none; border-radius: 6px; cursor: pointer; }
        .result { margin-top: 1.5rem; padding: 0.75rem 1rem; font-size: 1.5rem; line-height: 1.8;
                  border: 1px solid var(--border); border-radius: 6px; white-space: pre-wrap; }
        .error { margin-top: 1.5rem; padding: 0.75rem 1rem; border-radius: 6px; background: #fdecec; color: #8a1c1c; }
    </style>
</head>
<body>
    <h1>Darija Translator</h1>
    <p class="sub">PHP client · translate any text into Moroccan Arabic (Darija)</p>

    <form method="post">
        <label for="text">Text to translate</label>
        <textarea id="text" name="text" maxlength="<?= MAX_LENGTH ?>" required
                  placeholder="Where is the train station?"><?= e($text) ?></textarea>

        <fieldset>
            <label><input type="radio" name="script" value="arabic" <?= $script === 'arabic' ? 'checked' : '' ?>>
                Arabic script (العربية)</label>
            <label><input type="radio" name="script" value="latin" <?= $script === 'latin' ? 'checked' : '' ?>>
                Arabizi (Latin letters)</label>
        </fieldset>

        <button type="submit">Translate</button>
    </form>

    <?php if ($error !== null): ?>
        <div class="error" role="alert"><?= e($error) ?></div>
    <?php elseif ($translation !== null): ?>
        <div class="result" dir="<?= $script === 'latin' ? 'ltr' : 'rtl' ?>" lang="ar"><?= e($translation) ?></div>
    <?php endif; ?>
</body>
</html>
