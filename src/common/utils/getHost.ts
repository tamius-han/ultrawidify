
/**
 * Reqzests iframe parent hostname
 * @returns
 */
export async function getIframeParentHost(): Promise<string> {
  return new Promise<any>((resolve) => {
    let resolved = false;
    let resendInterval;

    function handleMessage(event) {
      if (event.data.action === 'uw-parent-hostname') {
        resolved = true;
        clearInterval(resendInterval);

        window.removeEventListener('message', handleMessage);
        resolve(event.data.hostname);
      }
    }

    window.addEventListener('message', handleMessage);
    resendInterval = setInterval(
      () => {
        if (!resolved) {
          window.parent.postMessage(
            { action: 'uw-get-parent-hostname' },
            '*'
          );
        }
      },
      500
    );
  });
}


function handleMessage(event) {
  if (event.data.action === 'uw-get-parent-hostname') {
    event.source.postMessage(
      {action: 'uw-parent-hostname', hostname: window.location.hostname},
      '*' as any
    )
  }
}

export async function setupHostnameReporting() {
  window.removeEventListener('message', handleMessage); // setupHostnameReporting may run more than once
  window.addEventListener('message', handleMessage);
}
