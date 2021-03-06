import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Storage } from '@ionic/storage';

import {v4 as uuid } from 'uuid';

// TODO: Implement Risk Statistics
// TODO: Make City Display support multiple columns

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit {

  defaultCities = [
    {name: 'Coronaville', color: 'safehaven', outbreaksTo: ['New York', 'Covid2020', 'Wuhan', 'London'], extantCount: 0},
    {name: 'Wuhan', color: 'safehaven', outbreaksTo: ['Coronaville', 'Covid2020', 'Tripoli', 'Istanbul'], extantCount: 0},
    {name: 'Covid2020', color: 'safehaven', outbreaksTo: ['Wuhan', 'Coronaville', 'Jacksonville', 'Sao Paulo', 'Lagos'], extantCount: 0},
    {name: 'Chicago', color: 'blue', outbreaksTo: ['Washington'], extantCount: 0},
    {name: 'New York', color: 'blue', outbreaksTo: ['Washington', 'Jacksonville', 'Coronaville'], extantCount: 0},
    {name: 'Washington', color: 'blue', outbreaksTo: ['Jacksonville', 'New York'], extantCount: 0},
    {name: 'Jacksonville', color: 'yellow', outbreaksTo: ['New York', 'Washington', 'Covid2020'], extantCount: 0},
    {name: 'Sao Paulo', color: 'yellow', outbreaksTo: ['Lagos', 'Covid2020'], extantCount: 0},
    {name: 'Lagos', color: 'yellow', outbreaksTo: ['Sao Paulo', 'Covid2020'], extantCount: 0},
    {name: 'London', color: 'blue', outbreaksTo: ['Coronaville'], extantCount: 0},
    {name: 'Tripoli', color: 'black', outbreaksTo: ['Cairo', 'Wuhan'], extantCount: 0},
    {name: 'Cairo', color: 'black', outbreaksTo: ['Tripoli', 'Istanbul'], extantCount: 0},
    {name: 'Istanbul', color: 'black', outbreaksTo: ['Cairo', 'Wuhan'], extantCount: 0}
  ].sort((a, b) => a.name < b.name ? -1 : +1 );

  integers = new Array(10);

  cities = JSON.parse(JSON.stringify(this.defaultCities)).map(v => {
    v.uuid = uuid();
    return v;
  });
  nonSafehavenCities = this.cities.filter(v => v.color !== 'safehaven');
  nonSafehavenCitiesLeadingBlank: any = this.withLeadingBlank(this.nonSafehavenCities);
  selectedCityId;
  selectedInfectionId;

  topDeckHistory = [[]];
  topDeckHistoryLeadingBlank = this.withLeadingBlank(this.topDeckHistory);

  partitionBags = [];
  infectionRate = 2;
  handledEpidemic = true;
  atLeastOneEpidemic = false;
  unwoundedRounds = [];

  hideRoundColumns = true;
  sortCriteria = [
    { value: 'name', label: 'City Name'},
    { value: 'color', label: 'City Color'},
    { value: 'balls', label: 'Num Balls'},
    { value: 'redballs', label: 'Red Balls'},
    { value: 'yellowballs', label: 'Yellow Balls'},
  ];
  ascendingDescending = [
    { value: 'ascending', label: '↑'},
    { value: 'descending', label: '↓'}
  ];

  sortCriteria1 = 'name';
  ascDesc1 = 'ascending';
  sortCriteria2 = '';
  ascDesc2 = 'ascending';

  constructor(
    private alertCtrl: AlertController,
    private storage: Storage,
    private cdr: ChangeDetectorRef
  ) {
  }

  async ngOnInit() {
    await this.restore();
    console.log(this.cities);
    console.log(this.nonSafehavenCities);
    console.log(this.topDeckHistory);
    this.recomputeBags('ngOnInit');
    this.updateDerivedArrays();
  }

  async infectCity(cityName = null, isEpidemic = false) {
    let infectWorked = false;
    cityName = cityName || this.selectedCityId;
    const topDeck: any = this.topDeckHistory.slice(-1)[0]; // last array in topDeckHistory
    let topDeckCity = topDeck.find((v: any) => v.name === cityName);
    if (!topDeckCity) {
      topDeckCity = {name: cityName, count: 0};
      topDeck.push(topDeckCity);
    }

    let sourceIsConsistent = false;
    if (!isEpidemic) {
      // in order to infect it, it has to be in the top deck, and there must be at least one of it
      // if you're in an epidemic and there are no cards infected in the current round
      // the discard pile is bag[0], otherwise it's the second bag if there are more than one bag
      // and the only bag otherwise
      let partitionBag;
      const numCardsInDiscardPile = this.topDeckHistory.slice(-1)[0].reduce((t, v) => {
        return t + v.count;
      }, 0);
      if (numCardsInDiscardPile === 0 && !this.handledEpidemic) {
        partitionBag = this.partitionBags[0];
      } else if (this.partitionBags[1] && this.partitionBags[1].length > 0) {
        partitionBag = this.partitionBags[1];
      } else {
        partitionBag = this.partitionBags[0];
      }

      const topBagCard = partitionBag.find(v => v.name === topDeckCity.name);
      if (topBagCard && topBagCard.count > 0) {
        sourceIsConsistent = true;
        if (!this.handledEpidemic) {
          // you can't draw cards if the infection rate is >= the cards in the top bag
          if (numCardsInDiscardPile >= this.infectionRate) {
            sourceIsConsistent = false;
          }
        }
      }

      if (sourceIsConsistent) {
        // check that doing this won't violate the consistence of extantCards
        const numExtantCards = this.cities.find(v => v.name === topDeckCity.name).extantCount;
        if (topDeckCity.count < numExtantCards)  {
          topDeckCity.count++;
          infectWorked = true;
        }
      }
    } else {
      // if it is an epidemic, the named card must be in the bottom-most stack
      const bottomBagCard = this.partitionBags.slice(-1)[0].find(v => v.name === topDeckCity.name);
      if (bottomBagCard && bottomBagCard.count > 0) {
        // if it's there, we can remove it from that stack, and add one to the top deck
        sourceIsConsistent = true;
      }

      if (sourceIsConsistent) {
        // check that doing this won't violate the consistence of extantCards
        const numExtantCards = this.cities.find(v => v.name === topDeckCity.name).extantCount;
        if (topDeckCity.count < numExtantCards)  {
          topDeckCity.count++;
          infectWorked = true;
        }
      }
    }

    this.recomputeBags('infectCity');
    await this.updateDerivedArrays();

    await this.save();
    this.detectChanges();
    return infectWorked;
  }

  async nextRound() {
    if (!this.handledEpidemic) {
      this.handledEpidemic = true;
      const prompt = await this.alertCtrl.create({
        header: 'Epidemic Complete',
        message: 'Continue game...',
      });
      await prompt.present();
      setTimeout(async () => {
        await prompt.dismiss();
      }, 1000);
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Next Round',
      message: 'Are you sure you want to start the next round?',
      inputs: [
        {
          name: 'increaseInfectionRate',
          type: 'checkbox',
          label: `+ Infection Rate to ${this.infectionRate + 1}?`,
          value: true
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
          }
        }, {
          text: 'Yes',
          handler: async (data) => {
            const whichCard = await this.whichCardWasDrawnFromBottom();
            if (whichCard) {
              this.selectedCityId = whichCard;
              const worked = await this.infectCity(null, true);
              if (worked) {
                if (data[0]) {
                  this.infectionRate++;
                }
                this.handledEpidemic = false;
                this.topDeckHistory.push([]);
                await this.updateDerivedArrays();
                this.atLeastOneEpidemic = true;
                await this.save();
              } else {
                return false;
              }
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async whichCardWasDrawnFromBottom() {
    let resolver;
    const ret = new Promise((r, j) => {
      resolver = r;
    });

    const alert = await this.alertCtrl.create({
      header: 'Epidemic!',
      message: 'What was the epidemic card?',
      inputs: [
        {
          type: 'text',
          name: 'city',
          placeholder: 'City name...'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
          }
        }, {
          text: 'OK',
          handler: (data) => {

            if (this.cities.find(v => v.name === data.city)) {
              resolver(data.city);
            } else {
              return false;
            }
          }
        }
      ]
    });
    await alert.present();
    return ret;
  }

  async uninfectCity(cityName = null) {
    cityName = cityName || this.selectedCityId;
    const topDeck: any = this.topDeckHistory.slice(-1)[0]; // last array in topDeckHistory
    let topDeckCity = topDeck.find((v: any) => v.name === cityName);
    if (!topDeckCity) {
      topDeckCity = {name: cityName, count: 0};
      topDeck.push(topDeckCity);
    }
    topDeckCity.count--;
    if (topDeckCity.count < 0) {
      topDeckCity.count = 0;
    }

    this.recomputeBags('uninfectCity');
    await this.updateDerivedArrays();

    await this.save();
    this.detectChanges();
  }

  roundCount(round, city) {
    if (Array.isArray(round)) {
      const cityInRound = round.find(v => v.name === city.name);
      return cityInRound ? cityInRound.count : 0;
    }
    return '';
  }

  contrastColor(color) {
    switch (color) {
      case 'black': return 'white';
      case 'yellow': return 'black';
      case 'blue': return 'white';
      case 'red': return 'white';
      case 'purple': return 'white';
      default: return 'black';
    }
  }

  withLeadingBlank(array) {
    return [''].concat(array);
  }

  async addInfectionCard(cityName = null) {
    const city = this.cities.find(v => v.name === (cityName || this.selectedInfectionId));
    if (city) {
      if (!city.extantCount) {
        city.extantCount = 0;
      }
      city.extantCount++;
    }
    this.recomputeBags('addInfectionCard');
    this.updateDerivedArrays();

    await this.save();
    this.detectChanges();
  }

  async removeInfectionCard(cityName = null) {
    const city = this.cities.find(v => v.name === (cityName || this.selectedInfectionId));
    if (city && (city.extantCount > 0)) {
      city.extantCount--;
    }
    await this.save();
    this.detectChanges();
  }

  async save() {
    await this.storage.set('topDeckHistory', this.topDeckHistory);
    await this.storage.set('cities', this.cities);
  }

  async restore() {
    try {
      const topDeckHistory = await this.storage.get('topDeckHistory');
      if (topDeckHistory) {
        this.topDeckHistory = JSON.parse(JSON.stringify(topDeckHistory));
      } else {
        this.topDeckHistory = [[]];
      }
    } catch (e) {
      this.topDeckHistory = [[]];
    }

    try {
      const cities = await this.storage.get('cities');
      if (cities) {
        this.cities = JSON.parse(JSON.stringify(cities));
      } else {
        this.cities = JSON.parse(JSON.stringify(this.defaultCities));
      }
    } catch (e) {
      this.cities = JSON.parse(JSON.stringify(this.defaultCities));
    }

    await this.updateDerivedArrays();
  }

  detectChanges() {
    try {
      this.cdr.detectChanges();
    } catch (e) {

    }
  }

  trackItem (index: number, city) {
    return city.uuid;
  }

  async resetGame() {
    const alert = await this.alertCtrl.create({
      header: 'Reset Game',
      message: `Are you sure you want Reset the game?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
          }
        }, {
          text: 'Yes',
          handler: async () => {
            this.topDeckHistory = [[]];
            this.infectionRate = 2;
            this.handledEpidemic = true;
            this.atLeastOneEpidemic = false;
            this.recomputeBags('resetGame');
            await this.updateDerivedArrays();
            this.save();
          }
        }
      ]
    });
    await alert.present();
  }

  async newInfectionCard() {
    const alert = await this.alertCtrl.create({
      header: 'New City',
      message: 'Define the new city and click Save',
      inputs: [
        {
          name: 'name',
          label: 'Name',
          type: 'text',
          placeholder: 'Enter city name...'
        },
        {
          name: 'color',
          label: 'Color',
          type: 'text',
          placeholder: 'red, yellow, black, blue, haven...'
        },
        {
          name: 'outbreaksTo',
          label: 'Outbreaks To',
          type: 'text',
          placeholder: 'comma separated list of names'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
          }
        }, {
          text: 'Save',
          handler: async (data) => {
            if (data.color) {
              data.color = data.color.trim();
            }
            if (data.name) {
              data.name = data.name.trim();
            }
            if (data.outbreaksTo) {
              data.outbreaksTo = data.outbreaksTo.split(',').map(v => v.trim()).filter(v => !!v);
            }
            if (['red', 'black', 'blue', 'yellow', 'purple'].includes(data.color) && data.name) {
              this.cities.push({
                name: data.name,
                color: data.color,
                outbreaksTo: Array.isArray(data.outbreaksTo) ? data.outbreaksTo : [],
                extantCount: 0,
                uuid: uuid()
              });

              this.recomputeBags('newInfectionCard');
              await this.updateDerivedArrays();
              await this.save();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteInfectionCard() {
    const alert = await this.alertCtrl.create({
      header: 'Delete City',
      message: `Are you sure you want Delete an Infect City card?`,
      inputs: [
        {
          type: 'text',
          name: 'cityName',
          placeholder: 'Enter a city name...'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
          }
        }, {
          text: 'Yes',
          handler: async (data) => {
            const cityIsValid = this.cities.find(v => v.name === data.cityName);
            if (cityIsValid) {
              this.cities = this.cities.filter(v => v.name !== data.cityName);

              this.recomputeBags('deleteInfectionCard');
              await this.updateDerivedArrays();
              this.save();
              return true;
            } else {
              return false;
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async unwoundYourself() {
    const alert = await this.alertCtrl.create({
      header: 'Unwound Yourself?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
          }
        }, {
          text: 'Yes',
          handler: async () => {
            const lastRound = this.topDeckHistory.pop();
            if (lastRound) {
              this.unwoundedRounds.push(lastRound);
            }
            if (this.topDeckHistory.length === 0) {
              this.topDeckHistory.push([]);
            }
            await this.recomputeBags('unwoundYourself');
            await this.updateDerivedArrays();
            await this.save();
            this.detectChanges();
          }
        }
      ]
    });
    await alert.present();
  }

  async rewoundYourself() {
    const alert = await this.alertCtrl.create({
      header: 'Rewound Yourself?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
          }
        }, {
          text: 'Yes',
          handler: async () => {
            const lastUnwound = this.unwoundedRounds.pop();
            if (lastUnwound) {
              this.topDeckHistory.push(lastUnwound);
            }
            await this.recomputeBags('rewoundYourself');
            await this.updateDerivedArrays();

            await this.save();
            this.detectChanges();
          }
        }
      ]
    });
    await alert.present();
  }

  sortCitiesByName(a, b) {
    return a.name < b.name ? -1 : +1;
  }

  sortCitiesByColor(a, b) {
    if (a.color === b.color) {
      return 0;
    }
    return (a.color < b.color) ? -1 : +1;
  }

  sortCitiesByBalls(a, b) {
    if (a.balls.filter(v => v === 'red' || v === 'yellow').length === b.balls.filter(v => v === 'red' || v === 'yellow').length) {
      return 0;
    }
    if (a.balls.filter(v => v === 'red' || v === 'yellow').length > b.balls.filter(v => v === 'red' || v === 'yellow').length) {
      return +1;
    }
    return -1;
  }

  sortCitiesByRedBalls(a, b) {
    if (a.balls.filter(v => v === 'red').length === b.balls.filter(v => v === 'red').length) {
      return 0;
    }
    if (a.balls.filter(v => v === 'red').length > b.balls.filter(v => v === 'red').length) {
      return +1;
    }
    return -1;
  }

  sortCitiesByYellowBalls(a, b) {
    if (a.balls.filter(v => v === 'yellow').length === b.balls.filter(v => v === 'yellow').length) {
      return 0;
    }
    if (a.balls.filter(v => v === 'yellow').length > b.balls.filter(v => v === 'yellow').length) {
      return +1;
    }
    return -1;
  }

  sortCitiesByRisk(a, b) {
    return 0;
  }

  async updateDerivedArrays() {
    // calculate risks by city
    for (let jj = 0; jj < this.cities.length; jj++) {
      const city = this.cities[jj];

      if (city.color === 'safehaven') {
        continue;
      }

      const balls = [];
      let hasNonBlack = false;
      for (let i = 0; i < city.extantCount; i++) {
        const oneInfectionArePossibleWithinXTurns = await this.cityIsWithinInfectionHorizon(city.name, 1, i + 1);
        const twoInfectionsArePossibleWithinXTurns = await this.cityIsWithinInfectionHorizon(city.name, 2, i + 1);
        if (oneInfectionArePossibleWithinXTurns === 1) {
          balls.push('red');
          hasNonBlack = true;
        } else if (oneInfectionArePossibleWithinXTurns === 0 && twoInfectionsArePossibleWithinXTurns === 1) {
          balls.push('yellow');
          hasNonBlack = true;
        } else {
          balls.push('black');
        }
      }

      if (hasNonBlack) {
        console.log(city.name, city.balls);
      }

      city.balls = balls;
    }

    this.cities.sort((a, b) => {
      let sort1 = 0;
      switch (this.sortCriteria1) {
        case 'name': sort1 = this.sortCitiesByName(a, b); break;
        case 'color': sort1 = this.sortCitiesByColor(a, b); break;
        case 'balls': sort1 = this.sortCitiesByBalls(a, b); break;
        case 'redballs': sort1 = this.sortCitiesByRedBalls(a, b); break;
        case 'yellowballs': sort1 = this.sortCitiesByYellowBalls(a, b); break;
      }

      if (sort1 === 0) {
        let sort2 = 0;
        switch (this.sortCriteria2) {
          case 'name': sort2 = this.sortCitiesByName(a, b); break;
          case 'color': sort2 = this.sortCitiesByColor(a, b); break;
          case 'balls': sort2 = this.sortCitiesByBalls(a, b); break;
          case 'redballs': sort1 = this.sortCitiesByRedBalls(a, b); break;
          case 'yellowballs': sort1 = this.sortCitiesByYellowBalls(a, b); break;
        }

        if (this.ascDesc2 === 'descending') {
          sort2 *= -1;
        }

        return sort2;
      }

      if (this.ascDesc1 === 'descending') {
        sort1 *= -1;
      }
      return sort1;
    });

    this.nonSafehavenCities = this.cities.filter(v => v.color !== 'safehaven');
    this.nonSafehavenCitiesLeadingBlank = this.withLeadingBlank(this.nonSafehavenCities);

    this.topDeckHistoryLeadingBlank = this.hideRoundColumns ? [''] : this.withLeadingBlank(this.topDeckHistory);
  }

  totalCardsInDeck() {
    return this.cities.reduce((t, v) => {
      return t + v.extantCount;
    }, 0);
  }

  totalDiscardedInCurrentRound() {
    return this.topDeckHistory.slice(-1)[0].reduce((t, v) => {
      return t + v.count;
    }, 0);
  }

  updateInfectionRate(increment) {
    this.infectionRate += increment;
    if (this.infectionRate < 0) {
      this.infectionRate = 0;
    }
    this.detectChanges();
  }

  unbag(cityName) {
    const bag = this.partitionBags[0];
    const foundCityIdx = bag.findIndex(v => v.name === cityName);
    if (foundCityIdx >= 0) {
      const foundCity = bag[foundCityIdx];
      foundCity.count--;
      if (foundCity.count === 0) {
        bag.splice(foundCityIdx, 1);
      }

      // if the whole bag is empty now remove it
      if (bag.length === 0) {
        this.partitionBags.shift();
      }
    }
  }

  rebag(cityName) {
    const bag = this.partitionBags[0];
    const foundCity = bag.find(v => v.name === cityName);
    if (foundCity) {
      foundCity.count++;
    } else {
      bag.push({
        name: cityName,
        count: 1
      });
    }
  }

  recomputeBags(caller = null) {
    // console.log('Recompute Called By ', caller);
    // initially it's one bag, consisting of the whole deck
    this.partitionBags = [this.cities
      .filter(v => v.color !== 'safehaven')
      .map(v => {
      return {
        name: v.name,
        count: v.extantCount
      }
    })];

    // given the topDeckHistory, build the bags by unbagging and pushing
    for (let ii = 0; ii < this.topDeckHistory.length; ii++) {
      const round = this.topDeckHistory[ii];
      const nextBag = [];
      // console.log('Round: ' + (ii + 1));
      for (let jj = 0; round && (jj < round.length); jj++) {
        const card = round[jj];
        // console.log('Card: ' + card.name);
        for (let kk = 0; card && (kk < card.count); kk++) {
          this.unbag(card.name);
          const cityInNextBag = nextBag.find(v => v.name === card.name);
          if (cityInNextBag) {
            cityInNextBag.count++;
          } else {
            nextBag.push({
              name: card.name,
              count: 1
            });
          }
        }
      }
      if (nextBag.length > 0) {
        this.partitionBags.unshift(nextBag);
      }
    }
    console.log(this.partitionBags);
  }

  // is it possible that this city experience numInfections within numTurns
  // and if it's possible what is the probability that it happens
  cityIsWithinInfectionHorizon(cityName, numTurns, numInfections) {
    let totalReachableCards = 0;
    const totalInfectedCardsInTurns = this.infectionRate * numTurns;
    let numPossibleInfections = 0;
    const debugCity = '';
    if (cityName === debugCity) {
      console.log(`Num Turns: ${numTurns},  Num Infections: ${numInfections}`);
    }

    for (let ii = 0; ii < this.partitionBags.length; ii++) {
      if (cityName === debugCity) {
        console.log(`ii = ${ii}, handledEpidemic = ${this.handledEpidemic}`);
      }

      if (this.handledEpidemic && (ii === 0)) {
        // the 'top' bag is the discard pile and should be ignored
        // except if you have _not_ yet handled the epidemic
        if (cityName === debugCity) {
          console.log(`Skipping Bag 0 because handleEpidemic = ${this.handledEpidemic}`);
        }

        continue;
      }

      const bag = this.partitionBags[ii];
      const cardsInBag = bag.reduce((t, v) => {
        return t + v.count;
      }, 0);

      const bagCity = bag.find(v => v.name === cityName);

      if (cityName === debugCity) {
        console.log(`Found in Bag: `, bagCity);
      }

      numPossibleInfections += (bagCity ? bagCity.count : 0);
      numPossibleInfections = Math.min(numPossibleInfections, totalInfectedCardsInTurns);

      totalReachableCards += cardsInBag;

      if (cityName === debugCity) {
        console.log(`After Considering Bag ${ii}, Total Reachable Cards: ${totalReachableCards} and Total Infected Cards In Turns ${totalInfectedCardsInTurns}`);
      }

      if (totalReachableCards >= totalInfectedCardsInTurns) {
        if (cityName === debugCity) {
          console.log(`Analysis Complete`);
        }
        break;
      }
    }

    // this is the answer to is it possible, more math is need to find out what the likelihood is

    if (cityName === debugCity) {
      console.log(`Num Possible Infections: ${numPossibleInfections}`);
    }

    if (numPossibleInfections >= numInfections) {
      return 1;
    }
    return 0;
  }

  async recomputeAndUpdate() {
    this.recomputeBags('recomputeAndUpdate');
    await this.updateDerivedArrays();
}

  async toggleShowHideRounds() {
    this.hideRoundColumns = !this.hideRoundColumns;
    await this.updateDerivedArrays();
    this.detectChanges();
  }

  cardsInRound(roundNum) {
    roundNum -= 1;
    if (!this.topDeckHistory || !Array.isArray(this.topDeckHistory[roundNum])) {
      return 0;
    }
    return this.topDeckHistory[roundNum].reduce((t, v) => {
      return t + v.count;
    }, 0);
  }
}
