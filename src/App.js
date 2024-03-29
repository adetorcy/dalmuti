/* eslint-disable jsx-a11y/accessible-emoji */
import React from 'react';
import $ from 'jquery';
import {CSSTransition} from 'react-transition-group';
import ReactCardFlip from 'react-card-flip';
import randomColor from 'randomcolor';
import './App.scss';

const DEBUG = false;

// Enum for possible game phases
const Phases = Object.freeze({
  TAXES: Symbol("taxes"),
  READY: Symbol("ready"),
  ONGOING: Symbol("ongoing"),
  OVER: Symbol("over")
});

function Card(props) {
  let classNames = "card";
  let value;

  if (props.selected) {
    classNames += " selected-card";
  }

  if (props.value) {
    value = props.value !== 13 ? props.value : "J";
  } else {
    value = "✘";
    classNames += " dead-card";
  }

  return (
    <button className={classNames} onClick={props.value ? props.onClick : null}>
      {value}
    </button>
  );
}

function PlayerHand(props) {
  return (
    <div className="player-hand">
      {props.cards.map((card, i) => (
        <Card
          value={card}
          selected={props.selected[i]}
          onClick={() => props.onClick(i)}
          key={i}
        />
      ))}
    </div>
  );
}

function PlayerButton(props) {
  let classNames = "btn shadow-none player-button";

  return (
    <button
      id={props.id}
      className={classNames}
      onClick={() => props.onClick()}
      disabled={!props.active}
    >
      {props.label}
    </button>
  );
}

function ResetButton(props) {
  let classNames = "btn shadow-none reset-button";

  return (
    <button className={classNames} onClick={() => props.onClick()}>
      {props.label || "Reset"}
    </button>
  );
}

function BotCard(props) {
  const speed = 0.3;
  return (
    <ReactCardFlip
      isFlipped={props.flipped}
      flipDirection="horizontal"
      flipSpeedBackToFront={speed}
      flipSpeedFrontToBack={speed}
      infinite={true}
    >
      <div className="bot-card" key="front" /* TODO: Face side in "front" */>
        ⭐
      </div>
      <div className="bot-card bot-card--face" key="back">
        {props.value !== 13 ? props.value : "J"}
      </div>
    </ReactCardFlip>
  );
}

function BotHand(props) {
  const padding = [];
  for (let i = props.cards.length; i < 16; i++) {
    padding.push(
      <div key={i} className="bot-card dead-card">
        ✘
      </div>
    );
  }
  return (
    <div className="bot-hand">
      {props.cards.map((card, i) => (
        <BotCard value={card} flipped={props.showCards} />
      ))}
      {padding}
    </div>
  );
}

function BotName(props) {
  return (
    <div className={props.playing ? "bot-name" : "restive bot-name"}>
      <nobr>{getRankName(props.rank)}</nobr>
    </div>
  );
}

function Bot(props) {
  return (
    <div className="bot">
      {props.endRank >= 0 ? (
        <BotMessage index={props.index} rank={getRankName(props.endRank)} />
      ) : (
        <BotName rank={props.startRank} playing={props.playing} />
      )}
      <BotHand cards={props.cards} showCards={props.showCards} />
    </div>
  );
}

function BotMessage(props) {
  return (
    <div className="rank bot-rank">
      <nobr>
        {props.rank === "Great Dalmuti" ? `${props.rank}!!` : props.rank}
      </nobr>
    </div>
  );
}

function PlayerFace(props) {
  const face = ["😔", "😎", "😌", "😒", "😥", "😱"][props.rank + 1]; // Covers case where rank is -1
  return <div className="player-face">{face}</div>;
}

function PlayerRank(props) {
  // If the person doesn't have a finishing rank, display their starting rank
  if (props.finish < 0) {
    return (
      <div className={props.playing ? "player-label" : "restive player-label"}>
        {getRankName(props.start)}
      </div>
    );
  }

  // Determine message based on finishing rank
  const adverb = props.start === props.finish ? "still" : "now";
  const message = [
    `Congratulations, you are ${adverb} the Great Dalmuti!`,
    `You didn't win but that's ok. You are ${adverb} the Lesser Dalmuti.`,
    `You are ${adverb} the Merchant. Try harder.`,
    `Bad luck, you are ${adverb} the Lesser Peon.`,
    `Oh no! You are ${adverb} the Greater Peon!`
  ][props.finish];

  return <div className="rank">{message}</div>;
}

function Move(props) {
  let label;
  const name = getName(props.name);
  const cards = props.cards;
  const size = props.cards.length;

  // If 6 or more of a kind, display a summary
  //   if (size > 5) {
  //     const nbJesters = cards.filter(card => card === 13).length;
  //     label = `${size} ${cards[0]}s`;

  //     if (nbJesters) {
  //       label += ` (with ${nbJesters} ${nbJesters > 1 ? "jesters" : "jester"})`;
  //     }
  //   } else

  if (size > 1) {
    // Display card array as is
    label = cards.map(x => (x === 13 ? "J" : x)).toString();
  } else if (size === 1) {
    // Single card. Jester is worth 13
    label = cards.toString();
  } else {
    // Player is passing
    label = "pass";
  }

  return (
    <div className="move">
      <nobr>{`${name}: ${label}`}</nobr>
    </div>
  );
}

function Moves(props) {
  const moves = [];

  const addMoves = (dest, src, previous = false) => {
    for (const move of src) {
      // Skip moves from players already out
      if (!move.alreadyOut) {
        dest.push({ ...move, previous: previous });
      }
    }
  };

  // Get previous moves from history
  for (const round of props.history) {
    addMoves(moves, round, true);
  }

  // Add current moves
  addMoves(moves, props.moves);

  const animClasses = {
    exit: "animated slow",
    exitActive: "fadeOutRightBig" // from animate.css
  };

  return (
    <div id="moves" className="moves">
      {moves.map((move, i) => (
        <CSSTransition
          key={i}
          in={!move.previous}
          classNames={animClasses}
          timeout={500}
          unmountOnExit={true}
        >
          <Move
            className="animated"
            number={move.number}
            name={move.name}
            cards={move.cards}
          />
        </CSSTransition>
      ))}
    </div>
  );
}

function TitleChar(props) {
  // Pick a random color
  const color = randomColor({ luminosity: "light" });

  // Pick a random animation timing function
  const anims = ["ease", "ease-in", "ease-out", "ease-in-out", "linear"];
  const anim = anims[Math.floor(Math.random() * anims.length)];

  const style = {
    "animationTimingFunction": anim,
    color: color
  };

  return (
    <div className="title-char" style={style}>
      {props.value}
    </div>
  );
}

function MainTitle(props) {
  const title = "The Great Dalmuti";

  return (
    <div className="main-title">
      {[...title].map((character, i) => (
        <TitleChar key={i} value={character} />
      ))}
    </div>
  );
}

function TaxMessage(props) {
  const messages = [
    "Let the Greater Peon have your worst two cards. Don't feel bad, they deserve it.",
    "You get to give your worst card to the Lesser Peon.",
    "You're not trading cards, but you can still call a revolution if you have two jesters.",
    "You must give your best card to the Lesser Dalmuti.",
    "You must give your best two cards to the Great Dalmuti. No whining, let's go!"
  ];
  return (
    <div className="center-message">
      It's tax season!<br />
      {messages[props.rank]}
    </div>
  );
}

function RevolutionMessage(props) {
  const message = `The ${getRankName(
    props.rank
  )} is calling a revolution. No taxes this time!`;
  return <div className="center-message">{message}</div>;
}

function ReadyMessage(props) {
  return (
    <div className="center-message play-prompt">
      Press play for the game to start
    </div>
  );
}

function Score(props) {
  return <div className="score">{`Score: ${props.score}`}</div>;
}

class Game extends React.Component {
  constructor(props) {
    super(props);

    this.timeoutIDs = [];

    this.state = {
      initialized: false,
      showCards: false,
      history: [],
      delay: 500 // ms
    };
  }

  reset(newGame = true) {
    // Abort any delayed turns
    this.clearTimeouts();

    // Init cards
    const cards = initDeck();
    shuffle(cards);

    // Init players: one human and 4 bots
    const players = [[], [], [], [], []];

    // If new game, determine the person's starting rank
    const personRank = newGame
      ? Math.floor(Math.random() * 5)
      : this.state.out.indexOf("person");

    // The bots' respective ranks are based on the person's rank
    // Person has ranks[0], bot1 has ranks[1], etc...
    const ranks = [
      personRank,
      (personRank + 1) % 5,
      (personRank + 2) % 5,
      (personRank + 3) % 5,
      (personRank + 4) % 5
    ];

    // Deal cards
    let i = 0;
    while (cards.length) {
      players[i % players.length].push(cards.pop());
      i++;
    }

    // Sort everyone's hand
    players.map(player => player.sort((a, b) => b - a));
    players.map(player => moveJestersRight(player)); // jesters at the end

    this.setState(state => ({
      initialized: true,
      showCards: false,
      phase: Phases.TAXES,
      callingRevolution: null, // rank of player calling it
      ranks: ranks,
      person: players[0],
      bot1: players[1],
      bot2: players[2],
      bot3: players[3],
      bot4: players[4],
      selected: Array(players[0].length).fill(false),
      moves: [], // current round
      history: [], // past rounds
      out: [], // who has gone out
      score: 0, // final score
      upNext: null // whose turn it is
    }));
  }

  clearTimeouts() {
    for (const timeoutID of this.timeoutIDs) {
      clearTimeout(timeoutID);
    }
  }

  getPlayButtonOnClick() {
    if (this.state.phase === Phases.TAXES) {
      return () => this.payTaxes();
    }
    if (this.state.phase === Phases.READY) {
      return () => this.startRound();
    }
    if (this.everyoneOut()) {
      return () => this.reset(false);
    }

    return () => this.play();
  }

  getPassButtonOnClick() {
    if (this.state.phase === Phases.TAXES) {
      return () => this.payTaxes();
    }
    return () => this.play();
  }

  getPlayButtonStatus() {
    if (
      this.state.upNext === "person" &&
      !this.state.person.every(x => !x) && // Not all cards are zeroes
      this.state.selected.includes(true)
    ) {
      return true;
    }
    if (
      // It's tax season and the person has selected cards
      this.state.phase === Phases.TAXES &&
      this.state.selected.includes(true)
    ) {
      return true;
    }
    if (
      // We're done with taxes and ready to start
      this.state.phase === Phases.READY
    ) {
      return true;
    }
    if (this.everyoneOut()) {
      // End of round
      return true;
    }

    // Inactive by default
    return false;
  }

  getPassButtonStatus() {
    if (
      // Should be disabled if the person just played
      this.state.moves.length &&
      this.state.moves.slice(-1)[0].name === "person"
    ) {
      return false;
    }
    if (
      // If the person is the merchant during tax season they need
      // to be able click plass to move on
      this.state.phase === Phases.TAXES &&
      !this.state.selected.includes(true) &&
      this.state.ranks[0] === 2
    ) {
      return true;
    }
    if (
      this.state.upNext === "person" &&
      !this.state.person.every(x => !x) && // Not all cards are zeroes
      !this.state.selected.includes(true)
    ) {
      return true;
    }

    // Inactive by default
    return false;
  }

  getScore() {
    // Each card of value x left in a bot's hand is worth (14-x)^2
    // Jester is worth 1 for now...
    const pointsPerCard = card => (14 - card) ** 2;

    // Sum per bot
    const pointsPerBot = bot =>
      bot.reduce((sum, card) => sum + pointsPerCard(card), 0);

    // Sum for all bots
    const bots = [
      this.state.bot1,
      this.state.bot2,
      this.state.bot3,
      this.state.bot4
    ];
    return bots.reduce((sum, bot) => sum + pointsPerBot(bot), 0);
  }

  revolution(rank) {
    // Someone is calling a revolution

    // Who gets to start?
    const gdIndex = this.state.ranks.indexOf(0);

    this.setState(state => ({
      phase: Phases.READY,
      callingRevolution: rank,
      selected: Array(state.person.length).fill(false),
      upNext: gdIndex > 0 ? `bot${gdIndex}` : "person"
    }));
  }

  startRound() {
    // Get out of ready or revolution state
    this.setState(
      {
        phase: Phases.ONGOING,
        callingRevolution: null
      },
      // Now the game starts
      () => this.turn()
    );
  }

  getPlayerRankName(player) {
    const botIndex = { person: 0, bot1: 1, bot2: 2, bot3: 3, bot4: 4 }[player];
    return getRankName(this.state.ranks[botIndex]);
  }

  payTaxes() {
    let insurgent = null; // Rank of the bot calling a revolution, if any
    const taxes = [];
    const cards = [];
    const personTaxes = [];

    // Each player pays taxes

    // Great Dalmuti
    const gdIndex = this.state.ranks.indexOf(0);
    if (gdIndex > 0) {
      // GD is one of the bots
      const gdCards = this.state[`bot${gdIndex}`].slice();
      cards.push(gdCards);

      // Determine GD Tax
      let card1 = pickHighestSingle(gdCards);
      let card2 = pickHighestSingle(subtractCards(gdCards, [card1]));
      taxes.push([card1, card2]);
    }

    // Lesser Dalmuti gives one card
    const ldIndex = this.state.ranks.indexOf(1);
    if (ldIndex > 0) {
      // LD is one of the bots
      const ldCards = this.state[`bot${ldIndex}`].slice();
      cards.push(ldCards);

      // Determine LD Tax
      taxes.push([pickHighestSingle(ldCards)]);
    }

    // Merchant
    const mIndex = this.state.ranks.indexOf(2);
    if (mIndex > 0) {
      const mCards = this.state[`bot${mIndex}`];
      cards.push(mCards);

      // Can we call a revolution?
      if (mCards.filter(card => card === 13).length === 2) {
        taxes.push([13, 13]);
        insurgent = 2;
      } else {
        // To have the correct indices
        taxes.push([]);
      }
    }

    // Lesser Peon
    const lpIndex = this.state.ranks.indexOf(3);
    if (lpIndex > 0) {
      // LP is one of the bots
      const lpCards = this.state[`bot${lpIndex}`];
      cards.push(lpCards);

      // Can we call a revolution?
      if (lpCards.filter(card => card === 13).length === 2) {
        taxes.push([13, 13]);
        insurgent = 3;
      } else {
        // Determine LP Tax
        taxes.push(pickBestCards(lpCards, 1));
      }
    }

    // Greater Peon
    const gpIndex = this.state.ranks.indexOf(4);
    if (gpIndex > 0) {
      // GP is one of the bots
      const gpCards = this.state[`bot${gpIndex}`];
      cards.push(gpCards);

      // Can we call a revolution?
      if (gpCards.filter(card => card === 13).length === 2) {
        taxes.push([13, 13]);
        insurgent = 4;
      } else {
        // Determine GP Tax
        taxes.push(pickBestCards(gpCards, 2));
      }
    }

    // At this point all the bots have determined their taxes
    // Now we look at the person's cards

    // Determine taxes from selected indices
    const personCards = this.state.person.slice();
    for (let i = 0; i < this.state.selected.length; i++) {
      // Add card to taxes (no removing here)
      if (this.state.selected[i]) {
        personTaxes.push(personCards[i]);
      }
    }

    // Validate the person's taxes based on their rank
    const pRank = this.state.ranks[0];

    // Two jesters?
    if (personTaxes.length === 2 && personTaxes.every(card => card === 13)) {
      // The person is calling a revolution
      this.revolution(pRank);
      return;
    }

    if (pRank > 2) {
      // Person is a peon, they must give their pRank-2 best cards
      if (!isValidTaxSelection(this.state.person, pRank - 2, personTaxes)) {
        shakePlayButton();
        return;
      }
    } else {
      // We just make sure it's the right number of cards (2-pRank)
      if (personTaxes.length !== 2 - pRank) {
        shakePlayButton();
        return;
      }
    }

    // At that point the person's taxes are valid
    // Insert the person's taxes and cards at the correct index
    taxes.splice(pRank, 0, personTaxes);
    cards.splice(pRank, 0, personCards);

    if (DEBUG) {
      console.log("************** BEFORE TAX **************");
      console.log(`GD tax: ${taxes[0].toString()}`);
      console.log(`LD tax: ${taxes[1].toString()}`);
      console.log(`M  tax: ${taxes[2].toString()}`);
      console.log(`LP tax: ${taxes[3].toString()}`);
      console.log(`GP tax: ${taxes[4].toString()}`);

      console.log(`GD cards: ${cards[0].toString()}`);
      console.log(`LD cards: ${cards[1].toString()}`);
      console.log(`M  cards: ${cards[2].toString()}`);
      console.log(`LP cards: ${cards[3].toString()}`);
      console.log(`GP cards: ${cards[4].toString()}`);
    }

    // Check if any of the bots is calling a revolution
    if (insurgent != null) {
      // A bot is calling a revolution (how dare they?)
      this.revolution(insurgent);
      return;
    }

    // Proceed with the cards swap

    // GD
    const gdCards = subtractCards(cards[0], taxes[0]);
    gdCards.push(...taxes[4]);

    // LD
    const ldCards = subtractCards(cards[1], taxes[1]);
    ldCards.push(...taxes[3]);

    // LP
    const lpCards = subtractCards(cards[3], taxes[3]);
    lpCards.push(...taxes[1]);

    // GP
    const gpCards = subtractCards(cards[4], taxes[4]);
    gpCards.push(...taxes[0]);

    // Update cards
    const newCards = [gdCards, ldCards, cards[2], lpCards, gpCards];

    // Sort cards again
    for (const i of [0, 1, 3, 4]) {
      newCards[i].sort((a, b) => b - a);
      moveJestersRight(newCards[i]);
    }

    if (DEBUG) {
      console.log("************** AFTER TAX **************");
      console.log(`GD cards: ${newCards[0].toString()}`);
      console.log(`LD cards: ${newCards[1].toString()}`);
      console.log(`M  cards: ${newCards[2].toString()}`);
      console.log(`LP cards: ${newCards[3].toString()}`);
      console.log(`GP cards: ${newCards[4].toString()}`);
    }

    this.setState(
      state => ({
        phase: Phases.READY,
        selected: Array(state.person.length).fill(false),
        person: newCards[state.ranks[0]],
        bot1: newCards[state.ranks[1]],
        bot2: newCards[state.ranks[2]],
        bot3: newCards[state.ranks[3]],
        bot4: newCards[state.ranks[4]],
        upNext: gdIndex > 0 ? `bot${gdIndex}` : "person"
      }),
      // Skip the ready state if person is the GD
      this.state.ranks[0] === 0 ? () => this.startRound() : null
    );
  }
  // ========= END PAY TAXES ==============

  areAllBotsOut() {
    return ["bot1", "bot2", "bot3", "bot4"].every(x =>
      this.state.out.includes(x)
    );
  }

  selectCard(index) {
    const selected = this.state.selected.slice();

    // Toggle selection
    selected[index] = !selected[index];

    this.setState({
      selected: selected
    });
  }

  clearSelection() {
    this.setState(state => ({
      selected: Array(state.person.length).fill(false)
    }));
  }

  getMoveNumber() {
    if (this.state.moves.length) {
      return 1 + this.state.moves.slice(-1)[0].number;
    }

    if (this.state.history.length) {
      return 1 + this.state.history.slice(-1)[0].slice(-1)[0].number;
    }

    return 1;
  }

  getLastMove() {
    // Get the last non-pass move from the state's list of moves
    // Return an empty array if we're first or everyone has passed so far
    const moves = this.state.moves;

    if (!moves.length) {
      return [];
    }

    let i = 1;
    while (i < moves.length && !moves.slice(-i)[0].cards.length) i++;

    return moves.slice(-i)[0].cards.slice();
  }

  isValidPlay(cards) {
    const cardSet = new Set(cards);
    const n = cardSet.size;

    if (n === 0) {
      // No card (pass)
      return true;
    }

    if (n > 2) {
      // More than two distinct cards
      return false;
    }

    if (n === 2 && !cardSet.has(13)) {
      // Two distinct cards with no jester
      return false;
    }

    // Get last non-pass move
    const lastPlayedCards = this.getLastMove();

    // If lastPlayedCards is empty we get to play what we want
    if (!lastPlayedCards.length) {
      return true;
    }

    // Check move size
    if (cards.length !== lastPlayedCards.length) {
      return false;
    }

    // Check move value
    if (resolveValue(cards).value >= resolveValue(lastPlayedCards).value) {
      return false;
    }

    return true;
  }

  play() {
    const move = [];
    const moveNumber = this.getMoveNumber();
    let score = this.state.score;

    // Argument for turn()
    const nextState = { upNext: getNextPlayer("person") };

    // No true in selected means pass
    if (!this.state.selected.includes(true)) {
      this.setState(
        state => ({
          moves: state.moves.concat([
            {
              number: moveNumber,
              name: "person",
              cards: move
            }
          ])
        }),
        // callback
        () => {
          slideDown("moves", this.state.delay / 2);
          const timeoutID = setTimeout(
            () => this.turn(nextState),
            this.state.delay
          );
          this.timeoutIDs.push(timeoutID);
        }
      );

      return;
    }

    // Make move from selected indices
    const cards = this.state.person.slice();

    // Start from the end since indices will shift
    for (let i = this.state.selected.length - 1; i >= 0; i--) {
      // Remove from cards and add to move
      // Chosen cards are replaced with zeroes in the splice call
      if (this.state.selected[i]) {
        move.push(cards.splice(i, 1, 0)[0]);
      }
    }

    // Check for valid play before updating state
    if (!this.isValidPlay(move)) {
      shakePlayButton();
      return;
    }

    // Are we going out?
    const out = this.state.out.slice();
    if (cards.every(x => !x)) {
      out.push("person");
      score = this.getScore();
    }

    // Update game state
    this.setState(
      state => ({
        moves: state.moves.concat([
          {
            number: moveNumber,
            name: "person",
            cards: move
          }
        ]),
        person: cards,
        selected: Array(cards.length).fill(false),
        score: score,
        out: out
      }),
      // callback
      () => {
        slideDown("moves", this.state.delay / 2);
        const timeoutID = setTimeout(
          () => this.turn(nextState),
          this.state.delay
        );
        this.timeoutIDs.push(timeoutID);
      }
    );
  }

  everyonePassed() {
    const last4moves = this.state.moves.slice(-4);

    if (last4moves.length < 4) {
      return false;
    }

    return last4moves.every(move => !move.cards.length);
  }

  everyoneOut() {
    return this.state.out.length === 5;
  }

  pass(player, out = false) {
    const playerRank = this.getPlayerRankName(player);
    const moveNumber = this.getMoveNumber();
    const nextState = { upNext: getNextPlayer(player) };

    // Update game state
    this.setState(
      state => ({
        moves: state.moves.concat([
          {
            number: moveNumber,
            name: playerRank,
            alreadyOut: out,
            cards: []
          }
        ])
      }),
      // callback
      !out
        ? () => {
            slideDown("moves", this.state.delay / 2);
            const timeoutID = setTimeout(
              () => this.turn(nextState),
              this.state.delay
            );
            this.timeoutIDs.push(timeoutID);
          }
        : () => this.turn(nextState)
    );
  }

  turn(newState = null) {
    // New turn?
    if (newState) {
      this.setState(
        newState,
        // Since setState() is asynchronous we call turn() again as a callback
        // rather than continuing from here, to make sure it uses the updated state
        () => this.turn()
      );
      return;
    }

    // Is everyone out?
    if (this.everyoneOut()) {
      // Clear the moves stack
      this.setState(
        state => ({
          history: state.history.concat([state.moves]),
          moves: [],
          upNext: null
        }),
        // Callback: update game phase after delay to allow for fade out
        () => {
          const timeoutID = setTimeout(
            () => this.setState({ phase: Phases.OVER }),
            this.state.delay
          );
          this.timeoutIDs.push(timeoutID);
        }
      );
      return;
    }

    // Has everyone passed?
    if (this.everyonePassed()) {
      // Clear the moves stack
      this.setState(
        state => ({
          history: state.history.concat([state.moves]),
          moves: []
        }),
        // Since setState() is asynchronous we call turn() again as a callback
        // rather than continuing from here, to make sure it uses the updated state
        () => this.turn()
      );
      return;
    }

    // Who's playing?
    const player = this.state.upNext;
    const playerRank = this.getPlayerRankName(player);
    let cards = this.state[player].slice();

    if (DEBUG) {
      console.log(`${playerRank} playing with [${cards.toString()}]`);
    }

    // If player is out already, pass
    if (!cards.length || cards.every(x => !x)) {
      this.pass(player, true);
      return;
    }

    // If the person is next, return and wait for them to play
    // unless all the bots have gone out, in which case we'll
    // finish on behalf of the player
    if (player === "person" && !this.areAllBotsOut()) {
      return;
    }

    // Get last non-pass move
    const lastPlayedCards = this.getLastMove();

    // Get move number and next player
    const moveNumber = this.getMoveNumber();
    const nextPlayer = getNextPlayer(player);

    // Decide which cards to play
    const move = pickCards(
      cards.filter(card => card > 0), // leave out zeroes for already played cards
      lastPlayedCards.length,
      lastPlayedCards.length ? resolveValue(lastPlayedCards).value : 14
    );

    if (DEBUG) {
      console.log(`${playerRank} played [${move.toString()}]`);
    }

    // Check for valid play
    if (!this.isValidPlay(move)) {
      throw new Error(`Invalid bot move [${move.toString()}]`);
    }

    // Remove played cards from bot cards
    cards = subtractCards(cards, move, player === "person");

    // Are we going out?
    const out = this.state.out.slice();
    if (!cards.length || cards.every(x => !x)) {
      out.push(player);
    }

    const nextState = {
      upNext: nextPlayer,
      [player]: cards,
      out: out
    };

    // Update game state
    this.setState(
      state => ({
        moves: state.moves.concat([
          {
            number: moveNumber,
            name: playerRank,
            cards: move
          }
        ])
      }),
      // callback
      () => {
        slideDown("moves", this.state.delay / 2);
        const timeoutID = setTimeout(
          () => this.turn(nextState),
          this.state.delay
        );
        this.timeoutIDs.push(timeoutID);
      }
    );
  }

  // +-----------------------------------+
  // |            GAME RENDER            |
  // +-----------------------------------+

  render() {
    return (
      <div className="game">
        {this.state.initialized ? (
          <div className="game-contents">
            <div className="game-row">
              <div className="game-column">
                <Bot
                  cards={this.state.bot2}
                  index={2}
                  startRank={this.state.ranks[2]}
                  playing={this.state.upNext === "bot2"}
                  endRank={this.state.out.indexOf("bot2")}
                  showCards={this.state.showCards}
                />

                <Bot
                  cards={this.state.bot1}
                  index={1}
                  startRank={this.state.ranks[1]}
                  playing={this.state.upNext === "bot1"}
                  endRank={this.state.out.indexOf("bot1")}
                  showCards={this.state.showCards}
                />
              </div>
              <div className="game-column">
                <div className="top-message">Message</div>
                <div className="center-panel">
                  {this.state.phase === Phases.TAXES && (
                    <TaxMessage rank={this.state.ranks[0]} />
                  )}
                  {this.state.callingRevolution != null && (
                    <RevolutionMessage rank={this.state.callingRevolution} />
                  )}
                  {this.state.phase === Phases.READY && <ReadyMessage />}
                  {this.state.phase === Phases.OVER && (
                    <Score score={this.state.score} />
                  )}
                  {this.state.phase === Phases.ONGOING && (
                    <Moves
                      moves={this.state.moves}
                      history={this.state.history}
                    />
                  )}
                </div>
              </div>
              <div className="game-column">
                <Bot
                  cards={this.state.bot3}
                  index={3}
                  startRank={this.state.ranks[3]}
                  playing={this.state.upNext === "bot3"}
                  endRank={this.state.out.indexOf("bot3")}
                  showCards={this.state.showCards}
                />

                <Bot
                  cards={this.state.bot4}
                  index={4}
                  startRank={this.state.ranks[4]}
                  playing={this.state.upNext === "bot4"}
                  endRank={this.state.out.indexOf("bot4")}
                  showCards={this.state.showCards}
                />
              </div>
            </div>
            <PlayerFace rank={this.state.out.indexOf("person")} />
            <div className="player-view">
              <PlayerRank
                start={this.state.ranks[0]}
                finish={this.state.out.indexOf("person")}
                playing={this.state.upNext === "person"}
              />
              <PlayerHand
                cards={this.state.person}
                selected={this.state.selected}
                onClick={i => this.selectCard(i)}
              />
              <div className="buttons-row">
                <PlayerButton
                  onClick={this.getPassButtonOnClick()}
                  active={this.getPassButtonStatus()}
                  label="Pass"
                />
                <PlayerButton
                  id="play_button"
                  onClick={this.getPlayButtonOnClick()}
                  active={this.getPlayButtonStatus()}
                  label="Play"
                />
                <PlayerButton
                  onClick={() => this.clearSelection()}
                  active={
                    !this.state.person.every(x => !x) && // Not all cards are zeroes
                    this.state.selected.includes(true)
                  }
                  label="Clear"
                />
              </div>
              <div className="buttons-row bottom-row">
                <PlayerButton
                  onClick={() =>
                    this.setState(state => ({ showCards: !state.showCards }))
                  }
                  label={this.state.showCards ? "Hide Cards" : "Show Cards"}
                  active={this.state.out.length !== 5}
                />
                <ResetButton onClick={() => this.reset()} />
              </div>
            </div>
          </div>
        ) : (
          // Not yet initialized
          <div className="welcome-screen">
            <div className="main-welcome-bits">
              <MainTitle />
              <div className="buttons-row">
                <ResetButton
                  label="New Game"
                  welcome={true}
                  onClick={() => this.reset()}
                />
              </div>
            </div>
            <div className="credits">
              {"AdT 2019 - For Jake the Snake and Silky the Hamster"}
            </div>
          </div>
        )}
      </div>
    );
  }
}

// ========================================

function initDeck() {
  let cards = [13, 13];

  for (let i = 1; i < 13; i++) {
    cards.push(...Array(i).fill(i));
  }

  return cards;
}

/**
 * Returns which cards to play from an array of integers.
 *
 * @param {Number[]} cards - An array of integers (the cards to choose from)
 * @param {Number} n - The number of cards to play, with 0 meaning unlimited
 * @param {Number} ceiling - The value to be strictly under
 * @returns {Number[]} An array with the cards played
 */
function pickCards(cards, n = 0, ceiling = 14) {
  // Sanity check
  if (n ? ceiling === 14 : ceiling !== 14) {
    throw new Error(`Invalid context: n=${n}, ceiling=${ceiling}`);
  }

  // How many jesters do we have on hand?
  const myJesters = cards.filter(card => card === 13).length;

  // Try to play with no jester first, then 1, then 2 if we have them
  for (let jesters = 0; jesters <= myJesters; jesters++) {
    // Try each value from 12 to 1 and see if we can play it
    for (let value = 12; value > 0; value--) {
      if (value >= ceiling) {
        continue;
      }

      // How many cards of that value do we have?
      let available = cards.filter(card => card === value).length;
      if (!available) {
        continue;
      }

      // If we have some and n is 0 we play all of them
      if (!n) {
        // Add jesters if that's all there is left
        let others = cards.filter(card => card !== value);
        if (new Set(others).size === 1 && others[0] === 13) {
          return Array(available)
            .fill(value)
            .concat(Array(others.length).fill(13));
        }

        return Array(available).fill(value);
      }

      // Do we have enough cards of that value?
      if (available + jesters < n) {
        continue;
      }

      // Return array of cards and jesters, if any
      return Array(n - jesters)
        .fill(value)
        .concat(Array(jesters).fill(13));
    }
  }

  // Stuck with only jesters?
  if (ceiling > 13 && cards.every(card => card === 13)) {
    return Array(cards.length).fill(13);
  }

  // No can play
  return [];
}

/**
 * Resolves the value of a move, possibly including jesters.
 *
 * @param {Number[]} cards - An array of integers
 * @returns {Object} The resolved value and number of jesters
 */
function resolveValue(cards) {
  const cardSet = new Set(cards);
  const n = cardSet.size;

  if (n === 1) {
    // Either all regular cards or all jesters, in which case the
    // jesters are counted as regular cards
    return { value: cardSet.values().next().value, jesters: 0 };
  }

  if (n === 2) {
    // Mix of jesters and regular cards

    // Count the jesters
    const jesters = cards.filter(card => card === 13).length;

    // Remove 13 from the set
    cardSet.delete(13);

    return { value: cardSet.values().next().value, jesters: jesters };
  }

  throw new Error(`Unable to resolve value from [${cards.toString()}]`);
}

/**
 * Subtract an array of cards from another one.
 *
 * @param {Number[]} hand - An array of integers (we'll be subtracting from)
 * @param {Number[]} cards - An array of integers
 * @returns {Number[]} An array with the remaining cards
 */
function subtractCards(hand, cards, insertZeroes = false) {
  let difference = hand.slice();

  // Iterate over cards
  for (let i = 0; i < cards.length; i++) {
    // Find index of card in difference, and remove it
    if (insertZeroes) {
      difference.splice(difference.indexOf(cards[i]), 1, 0);
    } else {
      difference.splice(difference.indexOf(cards[i]), 1);
    }
  }
  return difference;
}

/**
 * Shuffles an array in place.
 *
 * @param {Array} a
 */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

/**
 * Moves any preceding 13s to the end of an array.
 *
 * @param {Array} a
 */
function moveJestersRight(a) {
  while (a[0] === 13) {
    a.push(a.shift());
  }
}

/**
 * Adds a class to an element and removes it after a given delay.
 *
 * @param {String} elementId
 * @param {Number} delay
 */
function slideDown(elementId, delay = 250) {
  const element = $(`#${elementId}`);
  element.addClass("slide-in");
  setTimeout(() => element.removeClass("slide-in"), delay);
}

/**
 * Returns a slightly more polished player name.
 *
 * @param {String} rawName
 * @returns {String}
 */
function getName(rawName) {
  if (!rawName) {
    return "";
  }
  return rawName === "person" ? "You" : rawName;
  //return rawName === "person" ? "you" : rawName.replace(/bot/i, "player");
}

/**
 * Returns who should play after a given player.
 *
 * @param {String} player
 * @returns {String}
 */
function getNextPlayer(player) {
  return {
    person: "bot1",
    bot1: "bot2",
    bot2: "bot3",
    bot3: "bot4",
    bot4: "person"
  }[player];
}

/**
 * Returns the name of a given rank.
 *
 * @param {Number} rank
 * @returns {String}
 */
function getRankName(rank) {
  return [
    "Great Dalmuti",
    "Lesser Dalmuti",
    "Merchant",
    "Lesser Peon",
    "Greater Peon"
  ][rank];
}

/**
 * Returns the n rightmost non-13 values from an array.
 *
 * @param {Number[]} cards - An array of integers
 * @param {Number} n - How many elements we're picking
 * @returns {Number[]}
 */
function pickBestCards(cards, n = 1) {
  let end = cards.length - 1;

  while (cards[end] === 13) {
    end--;
  }

  return cards.slice(end - n + 1, end + 1);
}

/**
 * Returns the largest single value between 6 and 12 (inclusive)
 * from an array of integers, or the first element if no single is found.
 *
 * @param {Number[]} cards - An array of integers
 * @returns {Number}
 */
function pickHighestSingle(cards) {
  for (let i = 12; i > 5; i--) {
    const n = cards.filter(card => card === i).length;
    if (n === 1) {
      return i;
    }
  }

  return cards[0];
}

/**
 * Validates a selection of best cards
 *
 * @param {Number[]} cards - An array of integers
 * @param {Number} n - How many cards must be exchanged
 * @param {Number[]} taxes - An array of integers
 * @returns {Boolean}
 */
function isValidTaxSelection(cards, n, taxes) {
  if (taxes.length !== n) {
    return false;
  }

  const expected = pickBestCards(cards, n);

  return expected.every(card => taxes.includes(card));
}

/**
 * Makes the play button shake
 *
 * @param {Number} ms - The duration in milliseconds
 */
function shakePlayButton(ms = 500) {
  const play_btn = $("#play_button");
  play_btn.addClass("shake-button");
  setTimeout(() => play_btn.removeClass("shake-button"), ms);
}


export default Game;
