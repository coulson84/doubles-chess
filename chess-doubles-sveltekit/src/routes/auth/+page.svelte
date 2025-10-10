<script lang="ts">
  import { signIn } from "@auth/sveltekit/client";
  import { goto } from "$app/navigation";

  let mode: 'signin' | 'signup' = 'signin';
  let email = '';
  let password = '';
  let name = '';
  let error = '';
  let isLoading = false;

  async function handleSignIn() {
    error = '';
    isLoading = true;

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        error = 'Invalid email or password';
      } else {
        goto('/');
      }
    } catch (err) {
      error = 'An error occurred. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  async function handleSignUp() {
    error = '';
    isLoading = true;

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        error = data.message || 'Failed to create account';
        isLoading = false;
        return;
      }

      // Auto sign-in after successful signup
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        error = 'Account created but sign-in failed. Please try signing in manually.';
        mode = 'signin';
      } else {
        goto('/');
      }
    } catch (err) {
      error = 'An error occurred. Please try again.';
    } finally {
      isLoading = false;
    }
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (mode === 'signin') {
      handleSignIn();
    } else {
      handleSignUp();
    }
  }

  async function handleGoogleSignIn() {
    await signIn('google', { callbackUrl: '/' });
  }
</script>

<div class="auth-container">
  <div class="auth-card">
    <h1>Chess Doubles</h1>

    <div class="tabs">
      <button
        class="tab"
        class:active={mode === 'signin'}
        on:click={() => { mode = 'signin'; error = ''; }}
      >
        Sign In
      </button>
      <button
        class="tab"
        class:active={mode === 'signup'}
        on:click={() => { mode = 'signup'; error = ''; }}
      >
        Sign Up
      </button>
    </div>

    <form on:submit={handleSubmit}>
      {#if mode === 'signup'}
        <div class="form-group">
          <label for="name">Name</label>
          <input
            id="name"
            type="text"
            bind:value={name}
            required
            placeholder="Enter your name"
          />
        </div>
      {/if}

      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          placeholder="Enter your email"
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          placeholder="Enter your password"
          minlength={mode === 'signup' ? 8 : undefined}
        />
        {#if mode === 'signup'}
          <small>Minimum 8 characters</small>
        {/if}
      </div>

      {#if error}
        <div class="error-message">{error}</div>
      {/if}

      <button type="submit" class="btn-primary" disabled={isLoading}>
        {isLoading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
      </button>
    </form>

    <div class="divider">
      <span>OR</span>
    </div>

    <button class="btn-google" on:click={handleGoogleSignIn}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
      </svg>
      Continue with Google
    </button>

    <div class="back-link">
      <a href="/">← Back to Home</a>
    </div>
  </div>
</div>

<style>
  .auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif;
  }

  .auth-card {
    background: white;
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 420px;
  }

  h1 {
    text-align: center;
    color: #333;
    margin-bottom: 2rem;
    font-size: 2rem;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid #e0e0e0;
  }

  .tab {
    flex: 1;
    padding: 0.75rem;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    color: #666;
    transition: all 0.2s;
    position: relative;
    font-family: inherit;
  }

  .tab.active {
    color: #667eea;
  }

  .tab.active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 2px;
    background: #667eea;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    color: #333;
    font-weight: 500;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    font-family: inherit;
    transition: border-color 0.2s;
  }

  input:focus {
    outline: none;
    border-color: #667eea;
  }

  small {
    display: block;
    margin-top: 0.25rem;
    color: #666;
    font-size: 0.875rem;
  }

  .error-message {
    background: #fee;
    color: #c33;
    padding: 0.75rem;
    border-radius: 6px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .btn-primary {
    width: 100%;
    padding: 0.875rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    font-family: inherit;
  }

  .btn-primary:hover:not(:disabled) {
    background: #5568d3;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .divider {
    position: relative;
    text-align: center;
    margin: 1.5rem 0;
  }

  .divider::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 1px;
    background: #ddd;
  }

  .divider span {
    position: relative;
    background: white;
    padding: 0 1rem;
    color: #666;
    font-size: 0.875rem;
  }

  .btn-google {
    width: 100%;
    padding: 0.875rem;
    background: white;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    font-family: inherit;
  }

  .btn-google:hover {
    background: #f8f8f8;
    border-color: #ccc;
  }

  .back-link {
    text-align: center;
    margin-top: 1.5rem;
  }

  .back-link a {
    color: #667eea;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back-link a:hover {
    text-decoration: underline;
  }
</style>
