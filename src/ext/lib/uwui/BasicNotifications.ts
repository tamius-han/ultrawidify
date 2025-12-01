export class BasicNotifications {

  bodyElement: HTMLBodyElement;
  basicNotificationContainer: HTMLDivElement;
  isIframe = window.self !== window.top;
  activeNotifications = [];
  notificationCount = 0;

  constructor() {
    this.bodyElement = document.body as HTMLBodyElement;
    this.createNotificationContainer();
  }

  private createNotificationContainer() {
    this.basicNotificationContainer = document.createElement('div')
    this.basicNotificationContainer.style.all = 'initial';
    this.basicNotificationContainer.style.fontSize = '16px';
    this.basicNotificationContainer.style.fontFamily = "'Overpass', sans-serif";
    this.basicNotificationContainer.style.position = 'fixed';
    this.basicNotificationContainer.style.left = '0';
    this.basicNotificationContainer.style.top = '0';
    this.basicNotificationContainer.style.width = '100vw';
    this.basicNotificationContainer.style.height = '100vh';
    this.basicNotificationContainer.style.zIndex = '999999';
    this.basicNotificationContainer.style.pointerEvents = 'none';
    this.basicNotificationContainer.style.display = 'flex';
    this.basicNotificationContainer.style.flexDirection = 'column';

    this.bodyElement.appendChild(this.basicNotificationContainer);
  }

  showNotification(notification: {title: string, body?: string, expire?: number | false}) {
    if (this.isIframe) {
      return;
    }
    const notificationDiv = document.createElement('div');
    const notificationId = this.notificationCount++;
    notificationDiv.innerHTML = `
      <div style="
        display: flex; flex-direction: row;
        color: #fff;
        background-color: #fff;
        backdrop-filter: blur(1rem) brightness(0.33);
        margin: 1rem;
      ">
        <div style="display: flex; flex-direction: column;">
          <div><b style="text: #fff">${notification.title}</b></div>
          ${notification.body ? `<div style="color: #ccc">${document.body}</div>` : ''}
        </div>
        <div>
          <button id="ultrawidify-uw-notification-id-${notificationId}">Dismiss</button>
        </div>
      </div>
    `;
  }
}
