import type {GameEvent} from '../../game/types';

export default function RollOutcome({event}:{event:GameEvent}){
 return event.attack?<><strong className={`attack-outcome ${event.attack.hit?'hit':'miss'}`}>{event.attack.critical?'Critical hit!':event.attack.hit?'Hit':'Miss'}</strong><p><b>{event.attack.damage}</b> damage <span>· d20: {event.roll}</span></p></>:<><strong className="attack-outcome">Rolled {event.roll}</strong><p>{event.text}</p></>;
}
