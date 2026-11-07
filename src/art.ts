export type World = 'garden' | 'ocean' | 'sky';

const ink = '#35594D';
const coral = '#E89586';

function face(x = 80, y = 83, scale = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="${ink}">
    <ellipse cx="-12" cy="0" rx="2.4" ry="3.3"/><ellipse cx="12" cy="0" rx="2.4" ry="3.3"/>
    <ellipse cx="-21" cy="8" rx="6" ry="3.5" fill="${coral}" opacity=".55"/><ellipse cx="21" cy="8" rx="6" ry="3.5" fill="${coral}" opacity=".55"/>
    <path d="M-5 9 Q0 15 5 9" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>
  </g>`;
}

function daisy(color = '#EFB6C0'): string {
  const petals = Array.from({ length: 8 }, (_, i) => `<ellipse cx="80" cy="43" rx="15.5" ry="26" fill="${color}" transform="rotate(${i * 45} 80 80)"/>`).join('');
  return `<g>${petals}<circle cx="80" cy="80" r="28" fill="#EFCB72"/>${face(80, 77, .82)}</g>`;
}

function tulip(color = '#EFA38C'): string {
  return `<path d="M80 91 C77 111 84 129 80 144" stroke="#668C69" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M79 127 Q44 125 43 101 Q69 101 79 127M82 139 Q112 133 116 108 Q88 111 82 139" fill="#9BB592"/>
    <path d="M37 40 Q48 35 59 51 L79 24 L100 51 Q112 36 124 38 L119 80 Q113 109 80 109 Q45 106 41 79Z" fill="${color}"/>
    <path d="M61 54 Q59 74 67 91M99 54 Q103 73 95 91" fill="none" stroke="#D78178" stroke-width="2.5" opacity=".45" stroke-linecap="round"/>
    ${face(80, 74, .9)}`;
}

function butterfly(color = '#D3B4D6'): string {
  return `<path d="M77 75 C57 25 14 27 19 65 C21 83 38 91 54 88 C24 92 24 122 45 128 C65 136 78 112 81 95Z" fill="${color}"/>
    <path d="M83 75 C103 25 146 27 141 65 C139 83 122 91 106 88 C136 92 136 122 115 128 C95 136 82 112 79 95Z" fill="#EAAFA4"/>
    <ellipse cx="44" cy="61" rx="13" ry="16" transform="rotate(-35 44 61)" fill="#F7D2D3"/>
    <ellipse cx="116" cy="61" rx="13" ry="16" transform="rotate(35 116 61)" fill="#F7D7AC"/>
    <ellipse cx="53" cy="108" rx="9" ry="10" fill="#B599BD" opacity=".6"/><ellipse cx="107" cy="108" rx="9" ry="10" fill="#D88C82" opacity=".5"/>
    <path d="M76 57 Q64 35 61 46M84 57 Q97 35 100 46" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="73" y="57" width="14" height="54" rx="7" fill="#709784"/><circle cx="80" cy="62" r="12" fill="#92B49E"/>
    ${face(80, 61, .35)}`;
}

function snail(color = '#D6B2CF'): string {
  return `<path d="M20 118 Q43 112 95 114 Q104 104 108 90 Q111 80 121 80 Q134 80 134 94 L132 119 Q128 138 104 138 L35 138 Q20 138 14 129 Q10 121 20 118Z" fill="#A5BC91"/>
    <path d="M114 86 L109 64M126 86 L133 64" stroke="#6F9276" stroke-width="5" stroke-linecap="round"/>
    <circle cx="109" cy="63" r="5" fill="#6F9276"/><circle cx="133" cy="63" r="5" fill="#6F9276"/>
    <circle cx="65" cy="91" r="38" fill="${color}"/>
    <path d="M76 111 C46 126 30 90 49 72 C66 56 91 74 83 92 C78 106 58 101 60 89 C61 82 69 83 70 87" stroke="#B184A8" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    ${face(121, 98, .42)}`;
}

function leaf(color = '#A5BC91'): string {
  return `<path d="M79 132 C20 129 19 65 84 22 C129 47 140 123 79 132Z" fill="${color}"/>
    <path d="M79 145 Q87 112 83 47M82 111 L54 88M83 89 L106 65" fill="none" stroke="#6E9677" stroke-width="4" stroke-linecap="round"/>
    ${face(82, 88, .8)}`;
}

function bee(color = '#EBC569'): string {
  return `<ellipse cx="62" cy="46" rx="20" ry="29" transform="rotate(-35 62 46)" fill="#C3DCDD"/>
    <ellipse cx="99" cy="44" rx="20" ry="29" transform="rotate(35 99 44)" fill="#D9E7DD"/>
    <path d="M28 91 L17 99 L29 103Z" fill="${ink}"/>
    <ellipse cx="80" cy="91" rx="54" ry="37" fill="${color}"/>
    <path d="M55 59 Q44 89 54 122M76 55 Q66 91 76 127" fill="none" stroke="#6A7160" stroke-width="10"/>
    <path d="M114 63 L119 46" stroke="${ink}" stroke-width="3" stroke-linecap="round"/><circle cx="120" cy="44" r="3.5" fill="${ink}"/>
    ${face(110, 87, .65)}`;
}

function fish(color = '#EAA68E'): string {
  return `<path d="M113 78 Q132 59 146 57 L145 110 Q127 108 113 94Z" fill="#D68E7C"/>
    <path d="M64 56 Q70 28 92 45 L103 61M69 110 Q86 133 102 108" fill="#E9C076"/>
    <ellipse cx="72" cy="83" rx="52" ry="36" fill="${color}"/>
    <path d="M83 71 Q104 77 86 94" fill="#F5C5A8"/>
    ${face(51, 79, .75)}<circle cx="18" cy="49" r="6" fill="none" stroke="#ACCFCA" stroke-width="2.5"/>`;
}

function octopus(color = '#CCAED2'): string {
  return `<path d="M39 83 Q23 103 27 126 Q30 142 42 131 L50 110 Q42 141 59 142 Q69 143 71 118 Q71 148 84 145 Q96 142 90 117 Q101 146 115 137 Q126 129 108 106 Q135 134 143 119 Q149 108 120 87Z" fill="${color}"/>
    <path d="M32 85 C30 22 128 17 129 85 Q126 112 79 111 Q39 109 32 85Z" fill="${color}"/>
    <ellipse cx="54" cy="53" rx="8" ry="5" transform="rotate(-35 54 53)" fill="#E5D1E7"/>
    ${face(80, 78, 1.1)}`;
}

function starfish(color = '#EAA28F'): string {
  return `<path d="M75 22 Q81 11 87 23 L101 57 L137 60 Q152 62 141 73 L114 97 L122 132 Q126 148 111 140 L80 120 L47 139 Q32 148 37 131 L45 97 L18 73 Q6 61 24 59 L60 56Z" fill="${color}"/>
    <g fill="#CF8377" opacity=".5"><circle cx="80" cy="42" r="3"/><circle cx="79" cy="52" r="2.5"/><circle cx="36" cy="71" r="3"/><circle cx="124" cy="72" r="3"/><circle cx="50" cy="119" r="3"/><circle cx="108" cy="121" r="3"/></g>
    ${face(80, 82, .9)}`;
}

function seahorse(color = '#E7C176'): string {
  return `<path d="M87 46 L76 24 L65 39 L48 31 L52 52 L34 50 L47 69 L32 78 L48 88 L42 104 L61 109" fill="#D9A66A"/>
    <path d="M62 108 C41 89 44 50 72 40 Q100 31 107 54 L132 61 Q139 64 133 73 L107 76 Q95 81 101 101 C111 133 79 155 64 138 Q52 123 66 119 Q77 119 73 130 Q87 138 89 120 Q89 108 76 104Z" fill="${color}"/>
    <path d="M68 84 Q42 69 47 96 Q53 109 67 100" fill="#EBD4A1"/>
    <circle cx="88" cy="58" r="3.5" fill="${ink}"/><ellipse cx="94" cy="69" rx="6" ry="3.5" fill="#D68E7C" opacity=".6"/>
    <path d="M74 110 L88 112M73 117 L88 120" stroke="#CEAB69" stroke-width="2.5" stroke-linecap="round"/>`;
}

function shell(color = '#E3B5C3'): string {
  return `<path d="M63 128 C54 124 18 106 20 75 Q21 55 40 52 Q40 31 60 32 Q73 13 89 31 Q112 24 118 47 Q142 50 141 76 Q141 105 98 130Z" fill="${color}"/>
    <g fill="none" stroke="#C78DA8" stroke-width="3" stroke-linecap="round"><path d="M78 114 L61 46M68 116 L40 65M87 114 L91 45M95 115 L119 62"/></g>
    <path d="M63 120 Q80 112 99 120 L103 135 Q80 144 58 135Z" fill="#D39BB0"/>
    ${face(80, 95, .65)}`;
}

function jellyfish(color = '#B6C7DF'): string {
  return `<g fill="none" stroke="#AAC1CC" stroke-width="7" stroke-linecap="round"><path d="M47 90 Q35 111 49 127 Q58 137 48 146"/><path d="M70 95 Q80 114 69 131 L71 145"/><path d="M94 95 Q83 117 97 133 L97 147"/><path d="M116 88 Q129 106 115 125 Q107 136 118 145"/></g>
    <path d="M25 88 C23 4 138 3 137 88 Q123 102 111 90 Q97 105 82 92 Q67 106 53 92 Q39 102 25 88Z" fill="${color}"/>
    <ellipse cx="54" cy="43" rx="9" ry="6" transform="rotate(-35 54 43)" fill="#DFE8EA"/>
    ${face(81, 69, .95)}`;
}

function star(color = '#EEC975'): string {
  return `<path d="M73 20 Q80 7 87 22 L102 56 L139 61 Q153 63 142 75 L115 100 L120 138 Q122 151 109 143 L79 125 L45 143 Q33 149 36 134 L42 99 L16 73 Q6 62 21 60 L58 55Z" fill="${color}"/>
    <path d="M68 42 L73 29" stroke="#F8E4AB" stroke-width="6" stroke-linecap="round"/>${face(80, 85, .9)}`;
}

function cloud(color = '#F9F5EB'): string {
  return `<path d="M31 118 C0 112 8 77 32 76 C26 45 64 30 82 54 C108 29 139 57 131 81 C160 91 147 121 126 121Z" fill="${color}"/>
    ${face(79, 89, 1)}<path d="M47 135 L44 145M80 136 L77 148M113 135 L110 144" stroke="#C1D4DD" stroke-width="5" stroke-linecap="round"/>`;
}

function moon(color = '#E8C779'): string {
  return `<path d="M103 17 C39 6 8 74 39 117 C68 160 132 139 143 91 C102 113 66 70 103 17Z" fill="${color}"/>
    <circle cx="53" cy="75" r="7" fill="#D4B56B" opacity=".55"/><circle cx="62" cy="105" r="4" fill="#D4B56B" opacity=".55"/>
    <path d="M74 98 Q78 103 82 98M95 107 Q99 112 103 107" stroke="${ink}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="84" cy="113" rx="5" ry="3" fill="${coral}" opacity=".6"/>
    <path d="M120 30 L123 39 L132 42 L123 45 L120 54 L117 45 L108 42 L117 39Z" fill="#E4B889"/>`;
}

function rainbow(): string {
  return `<path d="M21 114 V83 A59 59 0 0 1 139 83 V114" fill="none" stroke="#DFA092" stroke-width="17" stroke-linecap="round"/>
    <path d="M38 114 V83 A42 42 0 0 1 122 83 V114" fill="none" stroke="#E8C67F" stroke-width="17" stroke-linecap="round"/>
    <path d="M55 114 V83 A25 25 0 0 1 105 83 V114" fill="none" stroke="#AAC0A3" stroke-width="17" stroke-linecap="round"/>
    <path d="M11 127 Q1 115 12 107 Q9 91 25 93 Q34 81 44 94 Q60 92 58 108 Q69 120 55 127Z" fill="#FAF5E9"/>
    <path d="M104 129 Q91 120 102 109 Q99 94 114 95 Q123 84 132 97 Q149 93 148 110 Q161 123 147 130Z" fill="#FAF5E9"/>`;
}

function sun(color = '#EFC57F'): string {
  const rays = Array.from({ length: 10 }, (_, i) => `<path d="M80 9 L80 21" transform="rotate(${i * 36} 80 80)"/>`).join('');
  return `<g fill="none" stroke="#E7B575" stroke-width="5" stroke-linecap="round">${rays}</g><circle cx="80" cy="80" r="46" fill="${color}"/>${face(80, 77, 1.1)}`;
}

function balloon(color = '#D7B4D0'): string {
  return `<path d="M79 107 Q63 119 83 132 Q96 142 80 153" stroke="#BCA995" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M80 107 L72 118 L89 118Z" fill="#BB94B7"/>
    <ellipse cx="80" cy="62" rx="45" ry="51" fill="${color}"/>
    <path d="M52 40 Q58 27 69 25" stroke="#EDD9E7" stroke-width="7" fill="none" stroke-linecap="round"/>${face(80, 66, .9)}`;
}

function drawing(world: World, variant: number, color?: string): string {
  const safeColor = color && /^#[\da-f]{3,8}$/i.test(color) ? color : undefined;
  const variants = world === 'garden'
    ? [daisy, tulip, butterfly, snail, leaf, bee]
    : world === 'ocean'
      ? [fish, octopus, starfish, seahorse, shell, jellyfish]
      : [star, cloud, moon, rainbow, sun, balloon];
  return variants[((Math.floor(variant) % 6) + 6) % 6](safeColor);
}

export function creature(world: World, variant: number, color?: string): string {
  return `<svg class="creature" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${drawing(world, variant, color)}</svg>`;
}

function at(markup: string, x: number, y: number, size: number, className = ''): string {
  return `<g transform="translate(${x} ${y}) scale(${size / 160})"><g class="${className}">${markup}</g></g>`;
}

function sprig(x: number, y: number, scale = 1, color = '#7C9A7A', flip = false): string {
  return `<g transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})" fill="${color}">
    <path d="M0 0 Q2-41-14-76" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    <path d="M-6-28 Q-36-31-31-50 Q-10-47-6-28M-7-45 Q11-65 21-52 Q18-39-7-45M-13-66 Q-32-67-30-84 Q-15-84-13-66"/>
  </g>`;
}

function groundDaisy(x: number, y: number, size: number, color: string): string {
  return `<g class="animate-sway"><path d="M${x + size / 2} ${y + size / 2} Q${x + size / 2 - 12} ${y + size} ${x + size / 2 + 2} ${y + size * 1.45}" stroke="#789675" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M${x + size / 2} ${y + size * 1.13} Q${x + size / 2 - 40} ${y + size * 1.13} ${x + size / 2 - 38} ${y + size * .96} Q${x + size / 2 - 8} ${y + size * .94} ${x + size / 2} ${y + size * 1.13}Z" fill="#A3B493"/>
    ${at(daisy(color), x, y, size)}</g>`;
}

function garden(): string {
  return `<path d="M0 601 Q172 513 356 574 Q582 637 786 597 Q1100 517 1440 586 V720 H0Z" fill="#E6EAD5"/>
    <path d="M0 662 Q219 577 445 642 Q733 718 961 645 Q1210 580 1440 637 V720 H0Z" fill="#D8DFC7"/>
    <path d="M0 702 Q271 650 501 691 Q828 746 1125 683 Q1300 661 1440 689 V720H0Z" fill="#CDD7B8"/>
    ${at(sun('#F1C893'), 1125, 67, 156, 'animate-float')}
    <g class="animate-drift" fill="#EEEDE2"><path d="M142 166 Q110 161 123 145 Q124 127 148 129 Q168 109 183 132 Q211 128 213 150 Q229 168 204 170Z"/><path d="M988 164 Q964 163 973 148 Q970 132 989 132 Q1007 114 1022 135 Q1049 132 1050 150 Q1064 167 1045 168Z"/></g>
    <g fill="#D2BC8B"><path d="M336 122 L339 131 L348 134 L339 137 L336 146 L333 137 L324 134 L333 131Z"/><circle cx="1068" cy="283" r="3"/><circle cx="284" cy="313" r="2.5"/></g>
    ${groundDaisy(111, 402, 158, '#EAB7C4')}
    ${groundDaisy(278, 491, 108, '#E9AD7D')}
    ${sprig(93, 628, 1.15)}${sprig(355, 651, .72, '#8BA07C', true)}${sprig(1045, 661, 1.1)}
    <g transform="translate(1150 506)"><g class="animate-sway"><path d="M35 57 L31 107 Q53 117 73 107 L70 57Z" fill="#E9DCC4"/><path d="M0 61 C6 0 93-7 109 58 Q62 76 0 61Z" fill="#DCA08D"/><ellipse cx="29" cy="43" rx="10" ry="7" fill="#F2D7BC" transform="rotate(-22 29 43)"/><ellipse cx="74" cy="34" rx="9" ry="7" fill="#F2D7BC"/><ellipse cx="51" cy="17" rx="5" ry="4" fill="#F2D7BC"/>${face(53, 87, .48)}</g></g>
    <g transform="translate(1301 576)"><path d="M8 51 L5 68M55 50 L58 67" stroke="#8CA889" stroke-width="12" stroke-linecap="round"/><path d="M1 52 Q-1 8 36 9 Q68 9 68 53Z" fill="#A7B69A"/><path d="M19 49 Q16 24 32 13M46 49 Q49 27 36 13" fill="none" stroke="#8DA584" stroke-width="2.5"/><path d="M65 39 Q92 23 100 40 Q105 56 88 60 L61 57Z" fill="#B9C9A7"/>${face(88, 43, .35)}</g>
    ${at(butterfly(), 291, 258, 76, 'animate-float')}
    <g fill="#F2E4AB"><circle cx="570" cy="645" r="4"/><circle cx="588" cy="660" r="3"/><circle cx="933" cy="663" r="4"/><circle cx="957" cy="650" r="3"/></g>
    <g fill="#829B78" opacity=".65"><path d="M412 675 l-5-15 10 9 5-14 1 20Z"/><path d="M1018 693 l-6-15 10 9 6-14 1 20Z"/></g>`;
}

function ocean(): string {
  return `<path d="M0 558 Q190 492 358 560 T720 557 T1088 556 T1440 539 V720 H0Z" fill="#DCE9DE"/>
    <path d="M0 632 Q190 558 380 622 T760 617 T1140 627 T1440 594 V720 H0Z" fill="#C8DFD5"/>
    <path d="M0 692 Q251 642 470 694 T958 685 T1440 671 V720H0Z" fill="#BED5C9"/>
    <g fill="none" stroke="#CADCD5" stroke-width="2.5" class="animate-float"><circle cx="176" cy="194" r="14"/><circle cx="210" cy="150" r="7"/><circle cx="1201" cy="240" r="18"/><circle cx="1241" cy="196" r="8"/><circle cx="1056" cy="112" r="10"/><circle cx="318" cy="344" r="5"/></g>
    <g transform="translate(1115 89)"><g class="animate-float"><path d="M14 55 C-9 106 29 137 91 122 Q133 120 146 90 Q163 93 178 73 Q158 77 153 61 Q147 75 141 79 Q116 27 64 28 Q31 29 14 55Z" fill="#ACC8CB"/><path d="M36 106 Q89 128 123 98 Q106 128 61 121Z" fill="#D9E5DD"/><path d="M74 93 Q70 119 53 111 Q45 103 58 88" fill="#8FADB4"/><circle cx="35" cy="74" r="3.5" fill="${ink}"/><path d="M27 90 Q33 96 39 91" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="44" cy="84" rx="6" ry="3" fill="#E3B2A6"/><path d="M58 22 Q48 3 42 14M59 21 Q68 0 77 12" stroke="#A2C4CB" stroke-width="4" fill="none" stroke-linecap="round"/></g></g>
    <g transform="translate(185 627)"><g fill="none" stroke="#D5A08F" stroke-width="13" stroke-linecap="round" class="animate-sway"><path d="M0 0 L-5-91M-3-39 Q-42-40-42-71M-6-65 Q25-65 25-105M-29-41 L-30-18M-5-7 Q37-11 38-48"/></g></g>
    <g transform="translate(1250 651)"><g fill="none" stroke="#9DBAA5" stroke-width="14" stroke-linecap="round" class="animate-sway"><path d="M0 0 Q-25-48-4-104M23 0 Q46-49 21-78M-25 0 Q-61-35-43-75"/></g></g>
    ${at(shell(), 271, 555, 98)}${at(starfish(), 1104, 565, 94)}
    ${at(fish(), 94, 372, 151, 'animate-float')}${at(jellyfish(), 1300, 348, 92, 'animate-float')}
    <g fill="#A4BDB0" opacity=".75"><ellipse cx="466" cy="654" rx="11" ry="5"/><ellipse cx="487" cy="664" rx="7" ry="4"/><ellipse cx="961" cy="672" rx="13" ry="5"/></g>
    <g fill="#F4E6C4"><circle cx="92" cy="657" r="3"/><circle cx="105" cy="665" r="2"/><circle cx="1055" cy="639" r="3"/><circle cx="1071" cy="650" r="2.5"/></g>`;
}

function sky(): string {
  return `<path d="M0 608 Q131 518 280 575 Q418 497 554 577 Q735 527 896 580 Q1065 493 1225 570 Q1355 538 1440 591 V720 H0Z" fill="#E7DDD9"/>
    <path d="M0 662 Q130 572 262 633 Q405 570 551 648 Q716 591 886 643 Q1039 560 1196 639 Q1334 586 1440 645 V720H0Z" fill="#DAD7E0"/>
    <path d="M0 703 Q180 653 342 698 Q513 655 717 702 Q927 651 1113 701 Q1307 653 1440 698 V720H0Z" fill="#CCCFE0"/>
    ${at(moon(), 1159, 71, 151, 'animate-float')}
    <g fill="#D9BC84"><path d="M287 149 L291 161 L304 165 L291 169 L287 182 L283 169 L270 165 L283 161Z"/><path d="M1092 239 L1095 248 L1104 251 L1095 254 L1092 263 L1089 254 L1080 251 L1089 248Z"/><path d="M1303 348 L1307 361 L1320 365 L1307 369 L1303 382 L1299 369 L1286 365 L1299 361Z"/><circle cx="1073" cy="121" r="3"/><circle cx="223" cy="287" r="3"/><circle cx="378" cy="85" r="2.5"/></g>
    ${at(rainbow(), 76, 380, 248)}${at(cloud(), 1134, 448, 217, 'animate-drift')}
    ${at(star(), 320, 499, 80, 'animate-float')}${at(balloon(), 136, 155, 86, 'animate-float')}
    <g fill="#F4EEE5" class="animate-drift"><path d="M394 315 Q372 309 383 296 Q381 276 403 277 Q415 263 428 281 Q448 278 452 297 Q464 312 447 317Z"/><path d="M999 157 Q981 155 989 143 Q988 126 1006 127 Q1020 111 1033 129 Q1056 124 1057 145 Q1067 160 1050 162Z"/></g>
    <g fill="#F1E3BB"><path d="M883 638 L886 647 L895 650 L886 653 L883 662 L880 653 L871 650 L880 647Z"/><path d="M488 656 L491 664 L499 667 L491 670 L488 678 L485 670 L477 667 L485 664Z"/></g>`;
}

export function landscape(world: World): string {
  const content = world === 'garden' ? garden() : world === 'ocean' ? ocean() : sky();
  return `<svg class="landscape" viewBox="0 0 1440 720" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${content}</svg>`;
}
