import { CommandInterface } from '@src/common/interfaces/SettingsInterface';
import Settings from '@src/ext/lib/settings/Settings';


const SVG_NS = "http://www.w3.org/2000/svg";


class MenuItemConfig {
  textSize: number;
  width: number
  height: number;

  xPad: number;
  yPad: number;

  constructor(options: {textSize: number, width: number, xPad: number, yPad: number}) {
    this.textSize = options.textSize;
    this.xPad = options.xPad;
    this.yPad = options.yPad;
    this.height = options.textSize + 2 * options.yPad;
    this.width = options.width;
  }
}

class MenuItem {
  label: string;
  hasHover: boolean;
  clickAction: () => void;
  parent?: MenuItem;
  children?: MenuItem[];


  svg: any;

  static config: MenuItemConfig;

  static fromCommand(command: CommandInterface, executor: (command: string, args?: any) => void, parent?: MenuItem) {
    return new MenuItem({
      label: command.label,
      clickAction: () => {executor(command.action, command.arguments)},
      parent: parent
    });
  }

  constructor(data: any) {
    this.label = data.label;
    this.clickAction = data.clickAction;
    this.hasHover = false;
    this.children = [] as MenuItem[];
  };

  private createSvg() {
    const group =  document.createElementNS(SVG_NS, "g");

    const textElem = document.createElementNS(SVG_NS, "text");
    textElem.textContent = this.label;
    textElem.setAttribute('x', `${MenuItem.config.xPad}`);
    textElem.setAttribute('y', `${MenuItem.config.yPad}`);
    group.appendChild(textElem);

    // Measure text width safely
    // const width = textElem.getComputedTextLength() + 2 * hPadding;
    // const height = fontSize + 2 * vPadding;

    // Background rectangle
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute('x', '0');
    rect.setAttribute('y', `0`);
    rect.setAttribute('width', `${MenuItem.config.width}`);
    rect.setAttribute('height', `${MenuItem.config.height}`);
    group.insertBefore(rect, textElem);

    this.svg = group;
  }

  addSubitem(subitem: MenuItem) {
    this.children.push(subitem);
    if (!subitem.parent) {
      subitem.parent = this;
    }
  }
}

function buildMenu(settings: Settings, executor: (command: string, args?: any) => void) {
  const menu = new MenuItem(
    {label: 'Ultrawidify'}
  );


  const topLevelItems: { label: string; submenu?: CommandInterface[]; isZoom?: boolean }[] = [
    { label: "Ultrawidify" },
    ...(settings.active.commands.crop ? [{ label: "Crop", submenu: settings.active.commands.crop }] : []),
    ...(settings.active.commands.stretch ? [{ label: "Stretch", submenu: settings.active.commands.stretch }] : []),
    ...(settings.active.commands.zoom ? [{ label: "Zoom", submenu: settings.active.commands.zoom, isZoom: true }] : []),
    { label: "Alignment", submenu: [] },
    { label: "Extension settings" },
    { label: "Incorrect cropping?" },
    { label: "Report problem" }
  ];
}



function createMenuItem(label) {

}


export function createSvgMenu(playerEl: HTMLElement, settings: Settings) {
  if (!settings) {
    console.warn('trying to create menu, but settings are not defined:', settings, 'player el:', playerEl);
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'Heebo';
      src: url(${chrome.runtime.getURL('/ui/res/fonts/Heebo.tff')}) format('truetype');
    }
    @font-face {
      font-family: 'SourceCodePro';
      src: url(${chrome.runtime.getURL('/ui/res/fonts/SourceCodePro.tff')}) format('truetype');
    }
    #_uw_player_menu { width:100%; height:100%; position:absolute; top:0; left:0; pointer-events:none; }
    #_uw_player_menu {
      .menu { pointer-events:auto; }
      .menu-item text { font-family: 'Heebo'; font-size:14px; fill:#fff; }
      .submenu { display:none; }
      .menu-item:hover > .submenu { display:block; }
      .hover-zone { fill:transparent; pointer-events:auto; }
      .menu-item rect { fill:#222; rx:4; }
      .menu-item:hover > rect { fill:#444; }
    }
  `;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute('id', '_uw_player_menu');
  svg.append(style);
  playerEl.appendChild(svg);
  // shadow.appendChild(svg);


  // menuGroup.setAttribute('class', 'menu');
  svg.appendChild(menuGroup);

  const fontSize = 14;
  const vPadding = fontSize * 0.4;
  const hPadding = fontSize * 0.6;

  let currentY = 0;

  // --- Top level items ---
  const topLevelItems: { label: string; submenu?: CommandInterface[]; isZoom?: boolean }[] = [
    { label: "Ultrawidify" },
    ...(settings.active.commands.crop ? [{ label: "Crop", submenu: settings.active.commands.crop }] : []),
    ...(settings.active.commands.stretch ? [{ label: "Stretch", submenu: settings.active.commands.stretch }] : []),
    ...(settings.active.commands.zoom ? [{ label: "Zoom", submenu: settings.active.commands.zoom, isZoom: true }] : []),
    { label: "Alignment", submenu: [] },
    { label: "Extension settings" },
    { label: "Incorrect cropping?" },
    { label: "Report problem" }
  ];

  topLevelItems.forEach(item => {
    const itemGroup = document.createElementNS(SVG_NS, "g");
    itemGroup.setAttribute('class','menu-item');
    menuGroup.appendChild(itemGroup);

    // Text element
    const textElem = document.createElementNS(SVG_NS, "text");
    textElem.textContent = item.label;
    textElem.setAttribute('x', `${hPadding}`);
    textElem.setAttribute('y', `${currentY + fontSize}`);
    itemGroup.appendChild(textElem);

    // Measure text width safely
    const width = textElem.getComputedTextLength() + 2 * hPadding;
    const height = fontSize + 2 * vPadding;

    // Background rectangle
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute('x', '0');
    rect.setAttribute('y', `${currentY}`);
    rect.setAttribute('width', `${width}`);
    rect.setAttribute('height', `${height}`);
    itemGroup.insertBefore(rect, textElem);

    // --- Submenu ---
    if(item.submenu && item.submenu.length > 0) {
      const submenuGroup = document.createElementNS(SVG_NS, "g");
      submenuGroup.setAttribute('class','submenu');
      itemGroup.appendChild(submenuGroup);

      let subY = currentY;
      item.submenu.forEach(cmd => {
        const subGroup = document.createElementNS(SVG_NS, "g");
        subGroup.setAttribute('class','menu-item');
        submenuGroup.appendChild(subGroup);

        // Submenu text
        const subText = document.createElementNS(SVG_NS, "text");
        subText.textContent = cmd.label + (cmd.shortcut ? ` (${cmd.shortcut.key})` : '');
        subText.setAttribute('x', `${width + hPadding}`);
        subText.setAttribute('y', `${subY + fontSize}`);
        subGroup.appendChild(subText);

        const subWidth = subText.getComputedTextLength() + 2*hPadding;
        const subHeight = fontSize + 2*vPadding;

        const subRect = document.createElementNS(SVG_NS, "rect");
        subRect.setAttribute('x', `${width}`);
        subRect.setAttribute('y', `${subY}`);
        subRect.setAttribute('width', `${subWidth}`);
        subRect.setAttribute('height', `${subHeight}`);
        subGroup.insertBefore(subRect, subText);

        subY += subHeight;
      });

      // Zoom slider
      if(item.isZoom) {
        const sliderGroup = document.createElementNS(SVG_NS, "foreignObject");
        sliderGroup.setAttribute('x', `${width}`);
        sliderGroup.setAttribute('y', `${subY}`);
        sliderGroup.setAttribute('width', '150');
        sliderGroup.setAttribute('height', '40');
        sliderGroup.innerHTML = `<div style="width:100%;height:100%;background:#333;color:#fff;font-family:Heebo;padding:5px;">Zoom slider placeholder</div>`;
        submenuGroup.appendChild(sliderGroup);
      }

      // Hover retention zone
      const hoverZone = document.createElementNS(SVG_NS, "rect");
      hoverZone.setAttribute('class','hover-zone');
      hoverZone.setAttribute('x', `${width}`);
      hoverZone.setAttribute('y', `${currentY}`);
      hoverZone.setAttribute('width', '150');
      hoverZone.setAttribute('height', `${subY - currentY}`);
      itemGroup.appendChild(hoverZone);
    }

    currentY += height;
  });

  // --- Trigger logic ---
  const activation = settings.active.ui.inPlayer.activation;
  const triggerZone = settings.active.ui.inPlayer.triggerZoneDimensions;
  const distanceOptions = settings.active.ui.inPlayer.distanceOptions;

  function updateMenuVisibility(x: number, y: number) {
    let show = false;
    const rect = playerEl.getBoundingClientRect();

    if(activation === 'player') {
      if(x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) show = true;
    } else if(activation === 'trigger-zone' && triggerZone) {
      const tx = rect.width * (triggerZone.offsetX / 100);
      const ty = rect.height * (triggerZone.offsetY / 100);
      if(x >= tx && x <= tx + triggerZone.width && y >= ty && y <= ty + triggerZone.height) show = true;
    } else if(activation === 'distance' && distanceOptions) {
      const dist = distanceOptions.distance / 100 * (distanceOptions.relativeTo === 'width' ? rect.width : rect.height);
      const cx = rect.width/2;
      const cy = rect.height/2;
      if(Math.sqrt((x-cx)**2 + (y-cy)**2) <= dist) show = true;
    }

    menuGroup.style.display = show ? 'block' : 'none';
  }

  svg.addEventListener('mousemove', e => {
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    updateMenuVisibility(x,y);
  });

  menuGroup.style.display = 'none';
  return { svg, menuGroup };
}
