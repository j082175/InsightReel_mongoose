// Ultra-minimal test script
console.log('🚀 MINIMAL: Script loaded');

// Test if DOM elements exist
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 MINIMAL: DOM loaded');

  const output = document.getElementById('output');

  if (output) {
    output.innerHTML = '✅ Script loaded successfully!<br>Time: ' + new Date().toLocaleTimeString();
    console.log('🚀 MINIMAL: Output updated');
  } else {
    console.error('❌ MINIMAL: Output element not found');
  }

  // Test button
  const testBtn = document.getElementById('testBtn');
  if (testBtn) {
    testBtn.addEventListener('click', function() {
      console.log('🧪 MINIMAL: Test button clicked!');
      output.innerHTML += '<br>🧪 Test button clicked at ' + new Date().toLocaleTimeString();
    });
    console.log('🚀 MINIMAL: Test button listener added');
  } else {
    console.error('❌ MINIMAL: Test button not found');
  }

  // Alert button
  const alertBtn = document.getElementById('alertBtn');
  if (alertBtn) {
    alertBtn.addEventListener('click', function() {
      console.log('🚨 MINIMAL: Alert button clicked!');
      alert('Alert test successful!');
      output.innerHTML += '<br>🚨 Alert shown at ' + new Date().toLocaleTimeString();
    });
    console.log('🚀 MINIMAL: Alert button listener added');
  } else {
    console.error('❌ MINIMAL: Alert button not found');
  }

  console.log('🚀 MINIMAL: All setup complete');
});

// Test immediate execution
console.log('🚀 MINIMAL: Script executing immediately');

// Test window load
window.addEventListener('load', function() {
  console.log('🚀 MINIMAL: Window loaded');
});

// Test error handling
window.addEventListener('error', function(event) {
  console.error('❌ MINIMAL: Error occurred:', event.error);
});