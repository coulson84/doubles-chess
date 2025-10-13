<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<div class="verify-container">
  <div class="verify-card">
    <h1>Chess Doubles</h1>

    {#if data.success}
      <div class="success-message">
        <div class="icon">✓</div>
        <h2>Email Verified!</h2>
        <p>Your email has been successfully verified. You can now sign in to your account.</p>
        <a href="/auth" class="btn-primary">Go to Sign In</a>
      </div>
    {:else if data.error}
      <div class="error-message">
        <div class="icon">✗</div>
        <h2>Verification Failed</h2>
        <p>{data.error}</p>
        <a href="/auth" class="btn-secondary">Back to Sign In</a>
      </div>
    {:else}
      <div class="loading-message">
        <p>Verifying your email...</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .verify-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif;
  }

  .verify-card {
    background: white;
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 500px;
    text-align: center;
  }

  h1 {
    color: #333;
    margin-bottom: 2rem;
    font-size: 2rem;
  }

  .icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    font-size: 3rem;
    font-weight: bold;
  }

  .success-message .icon {
    background: #d4edda;
    color: #28a745;
  }

  .error-message .icon {
    background: #f8d7da;
    color: #dc3545;
  }

  h2 {
    color: #333;
    margin-bottom: 1rem;
  }

  p {
    color: #666;
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .btn-primary,
  .btn-secondary {
    display: inline-block;
    padding: 0.875rem 2rem;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #667eea;
    color: white;
  }

  .btn-primary:hover {
    background: #5568d3;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #5a6268;
  }

  .loading-message p {
    margin-bottom: 0;
    color: #333;
  }
</style>
