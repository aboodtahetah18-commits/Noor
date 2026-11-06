/* Rakaez V26 — semantic icon identities for navigation.
   A single symbol represents one meaning; repeated occurrences of the same action keep its symbol. */
(function(){
'use strict';
if(typeof icons==='undefined'||typeof N==='undefined')return;
const navIcons={
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 receipt:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
 building:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-3h4v3"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 3"/>',
 clipboard:'<rect x="5" y="5" width="14" height="17" rx="2"/><path d="M9 3h6l1 4H8l1-4ZM9 12h6M9 16h6"/>',
 document:'<path d="M6 3h9l5 5v13H6zM15 3v5h5M9 12h8M9 16h7"/>'
};
for(const [key,value] of Object.entries(navIcons))icons[key]=value;
const navMeanings={
 hilal:'moon',malaa:'shield',assets:'trend',goals:'target',
 debts:'fund',fees:'receipt',reserves:'bank',position:'pie',
 interbank:'transfer',insights:'home',ledger:'reconcile',
 transactions:'wallet',funding:'payment',import:'upload',
 reports:'chart',settings:'settings',cycles:'calendar',
 externalBanks:'building',spending:'analysis',
 'spending-followups':'clipboard',scheduled:'clock',
 receivables:'income',documents:'document'
};
for(const item of N){
 const meaning=navMeanings[item[0]];
 if(meaning&&Object.prototype.hasOwnProperty.call(icons,meaning))item[2]=meaning;
}
if(typeof drawNav==='function')drawNav();
if(typeof rakaezDecorateButtons==='function')rakaezDecorateButtons(document);
})();