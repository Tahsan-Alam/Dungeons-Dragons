/* Words a painting description may not use: well-known characters and franchises from other stories. The image
   model would try to copy them, which the game cannot ship. Players describe the look instead ("a bald monk in
   orange robes with a blue arrow on his head" rather than a show's name). Checked on the server before anything is
   painted, and shown in the builder as they type. Whole words or phrases, any case. */

const NAMES=[
 'airbender','avatar the last','last airbender','aang','korra','pokemon','pokémon','pikachu','mario','luigi','zelda','hyrule','kirby','sonic the','minecraft','fortnite',
 'naruto','sasuke','goku','dragon ball','one piece','luffy','totoro','ghibli','sailor moon','demon slayer','attack on titan','jujutsu','my hero academia',
 'harry potter','hogwarts','hermione','dumbledore','voldemort','gandalf','frodo','hobbit','middle-earth','sauron','legolas','aragorn',
 'star wars','jedi','sith','darth','vader','yoda','skywalker','star trek',
 'marvel','avengers','spider-man','spiderman','iron man','hulk','marvel thor','loki laufeyson','deadpool','wolverine','x-men','batman','superman','wonder woman','dc comics',
 'disney','pixar','mickey','moana','shrek','spongebob','simpsons','barbie',
 'witcher','geralt','skyrim','elder scrolls','warcraft','world of warcraft','overwatch','league of legends','genshin','dota','dark souls','elden ring','final fantasy',"baldur's gate",
 'game of thrones','targaryen','lannister','daenerys','dungeons & dragons','dungeons and dragons','drizzt',
];
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const PATTERN=new RegExp(`(^|[^\\p{L}\\p{N}])(${NAMES.map(escape).join('|')})(?=$|[^\\p{L}\\p{N}])`,'iu');

/** The first borrowed name in the text, or null. */
export function borrowedName(text:string):string|null{
 const match=PATTERN.exec(text.normalize('NFKC'));
 return match?match[2]:null;
}
