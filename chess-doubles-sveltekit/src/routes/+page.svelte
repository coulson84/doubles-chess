<script lang="ts">
  import { SignIn, SignOut } from "@auth/sveltekit/components";
  import type { PageData } from "./$types";

  export let data: PageData;

  $: session = data.session;
  $: user = session?.user;
</script>

<div class="container">
  {#if user}
    <!-- Logged In UI -->
    <div class="logged-in">
      <header>
        <h1>Welcome back, {user.name || "User"}!</h1>
        {#if user.image}
          <img
            src={user.image}
            alt={user.name || "User avatar"}
            crossorigin="anonymous"
            class="avatar"
          />
        {/if}
      </header>

      <div class="user-info">
        <h2>Your Profile</h2>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
      </div>

      <div class="content">
        <h2>Dashboard</h2>
        <p>You are now logged in and can access the application.</p>
        <div class="card-grid">
          <div class="card">
            <h3>📊 Analytics</h3>
            <p>View your activity and statistics</p>
          </div>
          <div class="card">
            <h3>⚙️ Settings</h3>
            <p>Manage your account preferences</p>
          </div>
          <div class="card">
            <h3>📝 Content</h3>
            <p>Access your saved content</p>
          </div>
        </div>
      </div>

      <SignOut class="sign-out-btn">
        <span slot="submitButton">Sign Out</span>
      </SignOut>
    </div>
  {:else}
    <!-- Logged Out UI -->
    <div class="logged-out">
      <h1>Welcome to Chess Doubles</h1>
      <p>Please sign in with your Google account to continue</p>

      <div class="features">
        <div class="feature">
          <h3>🔒 Secure Authentication</h3>
          <p>Sign in safely with Google OAuth</p>
        </div>
        <div class="feature">
          <h3>⚡ Fast & Modern</h3>
          <p>Built with SvelteKit for optimal performance</p>
        </div>
        <div class="feature">
          <h3>🎯 Simple to Use</h3>
          <p>Get started in seconds</p>
        </div>
      </div>

      <SignIn provider="google" class="sign-in-btn">
        <span slot="submitButton">Sign in with Google</span>
      </SignIn>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif;
  }

  /* Logged Out Styles */
  .logged-out {
    text-align: center;
    padding: 4rem 2rem;
  }

  .logged-out h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    color: #333;
  }

  .logged-out > p {
    font-size: 1.25rem;
    color: #666;
    margin-bottom: 3rem;
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin: 3rem 0;
  }

  .feature {
    padding: 2rem;
    border-radius: 8px;
    background: #f5f5f5;
  }

  .feature h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: #333;
  }

  .feature p {
    color: #666;
  }

  /* Logged In Styles */
  .logged-in {
    padding: 2rem 0;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 2px solid #e0e0e0;
  }

  header h1 {
    font-size: 2.5rem;
    color: #333;
    margin: 0;
  }

  .avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: 3px solid #4285f4;
  }

  .user-info {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .user-info h2 {
    margin-top: 0;
    color: #333;
    font-size: 1.5rem;
  }

  .user-info p {
    margin: 0.5rem 0;
    color: #555;
  }

  .content {
    margin-bottom: 2rem;
  }

  .content h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: #333;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
  }

  .card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1.5rem;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .card h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 1.25rem;
  }

  .card p {
    margin: 0;
    color: #666;
  }

  /* Button Styles */
  :global(.sign-in-btn),
  :global(.sign-out-btn) {
    margin-top: 2rem;
  }

  :global(.sign-in-btn button),
  :global(.sign-out-btn button) {
    background: #4285f4;
    color: white;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    font-weight: 500;
  }

  :global(.sign-in-btn button:hover),
  :global(.sign-out-btn button:hover) {
    background: #357ae8;
  }

  :global(.sign-out-btn button) {
    background: #dc3545;
  }

  :global(.sign-out-btn button:hover) {
    background: #c82333;
  }
</style>
