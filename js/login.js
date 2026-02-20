// Inline fallback login form
        function showInlineLoginForm() {
            const formContainer = document.getElementById('auth-form-container');
            if (!formContainer || formContainer.innerHTML.trim() !== '') return;
            
            formContainer.innerHTML = `
                <h2 class="text-2xl text-center font-bold mb-6 text-gray-100">Log in to Daily Journal</h2>
                <div class="space-y-4">
                    <input id="login-email" type="email" placeholder="Email" class="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white">
                    <input id="login-password" type="password" placeholder="Password" class="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white">
                    <button onclick="handleLogin()" class="w-full p-3 bg-indigo-600 text-white font-semibold rounded-lg">Login</button>
                </div>
                <div class="mt-4 text-center text-gray-400">
                    Don't have an account? <a href="#" onclick="renderAuthForm('signup'); return false;" class="text-indigo-400 hover:underline">Sign up</a>
                </div>
                <div class="flex items-center my-6">
                    <div class="flex-grow border-t border-gray-700"></div>
                    <span class="flex-shrink mx-4 text-gray-500">OR</span>
                    <div class="flex-grow border-t border-gray-700"></div>
                </div>
                <button onclick="handleGoogleLogin()" class="w-full p-3 border border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center justify-center rounded-lg">
                    <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.2c-5.5 0-9.8 4.3-9.8 9.8 0 4.1 2.3 7.6 5.6 9.4l-.4-1.9c-2.4-1.4-4-4.1-4-7.5 0-4.8 3.9-8.7 8.7-8.7 2.6 0 5 1.1 6.7 2.7l-1.9 1.9c-1-1-2.3-1.6-3.8-1.6-3.2 0-5.8 2.6-5.8 5.8s2.6 5.8 5.8 5.8c2.8 0 4.4-1.2 5.1-1.9L16.2 14c.2-.2.3-.6.3-1s-.1-.8-.3-1l.7-.7c1.3-1.3 2.1-3.2 2.1-5.1C21.8 6.5 17.5 2.2 12 2.2z"/>
                    </svg> Log in with Google
                </button>
            `;
        }
        
        // Render login form when page loads - retry until available
        function tryRenderForm() {
            if (typeof renderAuthForm === 'function') {
                renderAuthForm('login');
            } else {
                // Show inline fallback after 2 seconds
                setTimeout(showInlineLoginForm, 2000);
                setTimeout(tryRenderForm, 100);
            }
        }
        window.addEventListener('load', tryRenderForm);