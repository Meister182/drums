import { nameFor, stickingById, type Setup, type StickingId, type VoiceId } from './model';

export type Lang = 'en' | 'pt';

const RATE_PT: Record<string, string> = {
  whole: 'semibreve',
  half: 'mínima',
  quarter: 'semínima',
  eighth: 'colcheia',
  '16th': 'semicolcheia',
  '32nd': 'fusa',
  'dotted whole': 'semibreve pontuada',
  'dotted half': 'mínima pontuada',
  'dotted quarter': 'semínima pontuada',
  'dotted eighth': 'colcheia pontuada',
  'dotted 16th': 'semicolcheia pontuada',
  'dotted 32nd': 'fusa pontuada',
  'half triplet': 'tercina de mínimas',
  'half triplets': 'tercinas de mínimas',
  'quarter triplets': 'tercinas de semínimas',
  'eighth triplets': 'tercinas de colcheias',
  '16th triplets': 'tercinas de semicolcheias',
};

export function rateName(setup: Setup, n: number, lang: Lang) {
  const english = nameFor(setup, n);
  if (lang === 'en') return english;
  return RATE_PT[english] ?? english;
}

const VOICE_PT: Record<VoiceId, string> = {
  click: 'Clique do metrônomo',
  snare: 'Caixa',
  kick: 'Bumbo',
  ride: 'Condução',
  hihat: 'Chimbal',
  tom: 'Tom',
  none: 'Sem som',
};

export function voiceName(id: VoiceId, lang: Lang) {
  return lang === 'pt' ? VOICE_PT[id] : VOICE_EN[id];
}

const VOICE_EN: Record<VoiceId, string> = {
  click: 'Metronome click',
  snare: 'Snare',
  kick: 'Bass drum',
  ride: 'Ride',
  hihat: 'Hi-hat',
  tom: 'Tom',
  none: 'No sound',
};

const STICKING_PT: Record<StickingId, string> = {
  singles: 'Simples',
  doubles: 'Dobradas',
  triples: 'Triplas',
  quadruples: 'Quádruplas',
  'single-paradiddle': 'Paradiddle simples',
  'double-paradiddle': 'Paradiddle duplo',
  'paradiddle-diddle': 'Paradiddle-diddle',
};

export function stickingName(id: StickingId, lang: Lang) {
  return lang === 'pt' ? STICKING_PT[id] : stickingById(id).label;
}

type Dict = Record<string, string>;

const EN: Dict = {
  appTitle: 'Drum exercises',
  hints:
    'Click a column title to show or hide those notes per bar. Shift-click or drag cells to build the score, click a cell to open it. On a phone, press and hold a cell, then drag. Grey columns are hidden.',
  bars: 'Bars',
  sticking: 'sticking',
  sig: 'Sig',
  tempo: 'Tempo',
  metronome: 'Metronome',
  every: 'every',
  unitBar: 'Bar',
  unitBeat: 'Beat',
  unitEighth: 'Eighths',
  right: 'R strokes',
  left: 'L strokes',
  loop: 'Loop',
  countIn: 'Count-in',
  library: 'Library',
  namePlaceholder: 'Name this setup',
  saveCurrent: 'Save current',
  load: 'Load',
  delete: 'Delete',
  nothingSaved: 'Nothing saved yet.',
  save: 'Save',
  play: 'Play',
  stop: 'Stop',
  loading: 'Loading…',
  share: 'Share',
  copied: 'Copied',
  pdf: 'PDF',
  score: 'Score',
  notesPerBar: 'notes per bar',
  cell: 'cell',
  cells: 'cells',
  bar: 'bar',
  barsWord: 'bars',
  legend:
    'Sticking above the staff, time signature at the start of each line. Print or save as PDF from the PDF button.',
  countInStatus: 'Count-in {n}',
  strokeStatus: 'stroke {i} of {n}',
  stepStatus: 'Step {i} of {n}',
  nameFirst: 'Name it first',
  savedNotice: 'Saved',
  deletedNotice: 'Deleted',
  loadedNotice: 'Loaded {name}',
  soundsFailed: 'Sounds failed to load',
  printTitle: 'Drum exercises',
  metronomeOff: 'off',
  perBar: 'per bar',
  saveFailed: 'Could not save',
  touchSelect: 'Selecting cells. Drag across the grid, then let go.',
};

const PT: Dict = {
  appTitle: 'Exercícios de bateria',
  hints:
    'Clique no título de uma coluna para mostrar ou esconder aquela quantidade de notas por compasso. Use Shift+clique ou arraste as células para montar a sequência; clique em uma célula para abri-la. No celular, segure uma célula e arraste. Colunas cinza estão ocultas.',
  bars: 'Compassos',
  sticking: 'baqueamento',
  sig: 'Fórmula',
  tempo: 'Andamento',
  metronome: 'Metrônomo',
  every: 'a cada',
  unitBar: 'Compasso',
  unitBeat: 'Tempo',
  unitEighth: 'Colcheias',
  right: 'Golpes R',
  left: 'Golpes L',
  loop: 'Repetir',
  countIn: 'Contagem',
  library: 'Biblioteca',
  namePlaceholder: 'Dê um nome a este exercício',
  saveCurrent: 'Salvar atual',
  load: 'Abrir',
  delete: 'Apagar',
  nothingSaved: 'Nada salvo ainda.',
  save: 'Salvar',
  play: 'Tocar',
  stop: 'Parar',
  loading: 'Carregando…',
  share: 'Compartilhar',
  copied: 'Copiado',
  pdf: 'PDF',
  score: 'Partitura',
  notesPerBar: 'notas por compasso',
  cell: 'célula',
  cells: 'células',
  bar: 'compasso',
  barsWord: 'compassos',
  legend:
    'Baqueamento acima da pauta, fórmula de compasso no início de cada linha. Imprima ou salve em PDF pelo botão PDF.',
  countInStatus: 'Contagem {n}',
  strokeStatus: 'nota {i} de {n}',
  stepStatus: 'Passo {i} de {n}',
  nameFirst: 'Dê um nome primeiro',
  savedNotice: 'Salvo',
  deletedNotice: 'Apagado',
  loadedNotice: 'Aberto: {name}',
  soundsFailed: 'Falha ao carregar os sons',
  printTitle: 'Exercícios de bateria',
  metronomeOff: 'desligado',
  perBar: 'por compasso',
  saveFailed: 'Não foi possível salvar',
  touchSelect: 'Selecionando células. Arraste pela grade e solte.',
};

export function t(lang: Lang, key: keyof typeof EN, vars: Record<string, string | number> = {}) {
  const dict = lang === 'pt' ? PT : EN;
  return (dict[key] ?? EN[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}
