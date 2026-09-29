
/**
 * Requests iframe parent hostname.
 *
 * Resolves with `undefined` if the parent doesn't answer within `timeoutMs`, so that extension
 * startup in the iframe is never blocked forever (e.g. if parent is about:blank, srcdoc, or a page
 * the extension can't run in). Without parent hostname, embedded-content rules fall back to defaults.
 * @returns
 */
export async function getIframeParentHost(timeoutMs: number = 3000): Promise<string | undefined> {
  return new Promise<string | undefined>((resolve) => {
    let resolved = false;
    let resendInterval;
    let giveUpTimeout;

    function finish(hostname: string | undefined) {
      resolved = true;
      clearInterval(resendInterval);
      clearTimeout(giveUpTimeout);
      window.removeEventListener('message', handleParentReply);
      resolve(hostname);
    }

    function handleParentReply(event) {
      if (event.data?.action === 'uw-parent-hostname') {
        finish(event.data.hostname);
      }
    }

    window.addEventListener('message', handleParentReply);
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

    giveUpTimeout = setTimeout(() => finish(undefined), timeoutMs);
  });
}


function handleMessage(event) {
  if (event.data?.action === 'uw-get-parent-hostname') {
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
