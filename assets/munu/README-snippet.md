<!-- ════════════════════════════════════════════════════════════════
     DockTerm — README header
     Copy the brand assets into  assets/brand/  first:
       munu.svg  munu-happy.svg  munu-working.svg  munu-sleeping.svg
       munu-asking.svg  munu-icon.svg  munu-icon-16.svg
       dockterm-logo.svg  dockterm-logo-light.svg
     (or change the paths below to wherever you keep them)
     ════════════════════════════════════════════════════════════════ -->

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)"  srcset="assets/brand/dockterm-logo.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/brand/dockterm-logo-light.svg">
    <img alt="DockTerm" src="assets/brand/dockterm-logo.svg" width="420">
  </picture>
</p>

<p align="center">
  the calm workspace for Claude Code — your terminal, with a face
</p>

<!-- swap these for your real badges -->
<p align="center">
  <img alt="license"  src="https://img.shields.io/badge/license-MIT-7c6bff?style=flat-square">
  <img alt="platform" src="https://img.shields.io/badge/platform-macOS%20%C2%B7%20Linux%20%C2%B7%20Windows-1a1a21?style=flat-square">
  <img alt="built for Claude Code" src="https://img.shields.io/badge/built%20for-Claude%20Code-7c6bff?style=flat-square">
  <img alt="status" src="https://img.shields.io/badge/status-early%20V1-fbbf24?style=flat-square">
</p>

---

## Meet munu

**munu is the mini DockTerm — the workspace that woke up.** It sits on the dark
terminal tile, watches your files and git, and never calls an AI of its own. Its
face just mirrors what DockTerm is doing — so a glance tells you the state.

<table align="center">
  <tr>
    <td align="center" width="150"><img src="assets/brand/munu.svg"          width="84"></td>
    <td align="center" width="150"><img src="assets/brand/munu-happy.svg"     width="84"></td>
    <td align="center" width="150"><img src="assets/brand/munu-working.svg"   width="84"></td>
    <td align="center" width="150"><img src="assets/brand/munu-sleeping.svg"  width="84"></td>
    <td align="center" width="150"><img src="assets/brand/munu-asking.svg"    width="84"></td>
  </tr>
  <tr>
    <td align="center"><b>resting</b><br><sub>idle / ready</sub></td>
    <td align="center"><b>happy</b><br><sub>working tree clean</sub></td>
    <td align="center"><b>working</b><br><sub>busy / running</sub></td>
    <td align="center"><b>sleeping</b><br><sub>paused / no project</sub></td>
    <td align="center"><b>asking</b><br><sub>needs your <code>[y/n]</code></sub></td>
  </tr>
</table>

> **asking** is the important one: when Claude Code pauses to request permission
> (run a command, edit a file), munu raises a brow and shows `[y/n]`. It never
> auto-approves — the decision is always yours.

<!-- ════════════════════════════════════════════════════════════════
     FAVICON / web (for the docs or landing site <head>):

     <link rel="icon" href="/favicon.ico" sizes="any">
     <link rel="icon" type="image/svg+xml" href="/munu-icon-16.svg">
     <link rel="apple-touch-icon" href="/munu-icon-180.png">
     <!-- PWA manifest: munu-icon-192.png and munu-icon-512.png -->
     ════════════════════════════════════════════════════════════════ -->
