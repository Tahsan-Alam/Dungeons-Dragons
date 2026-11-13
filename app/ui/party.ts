/** Six letters, upper case: the shape of every party code. */
export function normalizePartyCode(value:string):string {
 return value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,6);
}
export function partyCodeComplete(value:string):boolean {
 return /^[A-Z]{6}$/.test(value);
}

/** Open seats shown in the lobby; a party holds at most ten. */
export function openSeats(players:number,capacity=10):number {
 return Math.max(0,capacity-players);
}
