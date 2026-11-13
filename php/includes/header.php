<?php
declare(strict_types=1);

/**
 * Reusable PHP 8+ Header & Transparent Navbar Include
 * Expected variables: $pageTitle, $pageDescription, $activePage, $lightHeader (bool)
 */
$pageTitle = $pageTitle ?? 'CORONA PLUMBERS LTD | London Plumbing';
$pageDescription = $pageDescription ?? 'Precision plumbing repairs and copper craftsmanship across London.';
$activePage = $activePage ?? 'home';
$lightHeader = $lightHeader ?? false;
$headerClass = $lightHeader ? 'site-header header-light-surface' : 'site-header';
?>
<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>
    <meta name="description" content="<?= htmlspecialchars($pageDescription, ENT_QUOTES, 'UTF-8') ?>" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/css/corona.css" />
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <header id="siteHeader" class="<?= $headerClass ?>" role="banner">
      <div class="container">
        <div class="navbar-inner">
          <a href="/" class="brand-lockup" aria-label="CORONA PLUMBERS LTD Home">
            <img src="/assets/images/corona-logo.png" alt="CORONA PLUMBERS LTD official emblem" class="brand-logo-img" width="82" height="82" />
            <span class="brand-wordmark">CORONA PLUMBERS LTD</span>
          </a>
          <nav class="desktop-nav" aria-label="Primary navigation">
            <a href="/" class="nav-item-link <?= $activePage === 'home' ? 'is-active' : '' ?>">Home</a>
            <div class="nav-dropdown">
              <button type="button" class="nav-dropdown-trigger <?= $activePage === 'services' ? 'is-active' : '' ?>" aria-expanded="false" aria-haspopup="true">
                <span>Plumbing Services</span>
                <span aria-hidden="true">▾</span>
              </button>
              <div class="nav-dropdown-menu" role="menu">
                <div class="nav-dropdown-surface">
                  <a href="/services.php" class="nav-dropdown-link" role="menuitem">All Plumbing Services →</a>
                  <a href="/services.php#burst-pipe-repairs" class="nav-dropdown-link" role="menuitem">Burst Pipe Repairs</a>
                  <a href="/services.php#leaking-tap-fixes" class="nav-dropdown-link" role="menuitem">Leaking Tap Fixes</a>
                  <a href="/services.php#kitchen-plumbing" class="nav-dropdown-link" role="menuitem">Kitchen Plumbing</a>
                  <a href="/services.php#bathroom-plumbing" class="nav-dropdown-link" role="menuitem">Bathroom Plumbing</a>
                  <a href="/services.php#appliance-replacement" class="nav-dropdown-link" role="menuitem">Appliance Replacement</a>
                  <a href="/services.php#pipework-maintenance" class="nav-dropdown-link" role="menuitem">Pipework Maintenance</a>
                </div>
              </div>
            </div>
            <a href="/our-work.php" class="nav-item-link <?= $activePage === 'our-work' ? 'is-active' : '' ?>">Our Work</a>
            <a href="/our-work.php#about" class="nav-item-link">About</a>
            <a href="/contact.php" class="nav-item-link <?= $activePage === 'contact' ? 'is-active' : '' ?>">Contact</a>
          </nav>
          <div class="d-none d-lg-flex align-items-center">
            <a href="/contact.php" class="cta-link cta-link--light">
              <span>Request a Quote</span>
              <span class="cta-arrow" aria-hidden="true">→</span>
            </a>
          </div>
          <button id="mobileMenuOpen" type="button" class="mobile-menu-toggle" aria-expanded="false" aria-controls="mobileDrawer">
            <span>Menu</span><span aria-hidden="true">☰</span>
          </button>
        </div>
      </div>
    </header>
