import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Storage } from '@ionic/storage';

import {v4 as uuid } from 'uuid';

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

  cities = JSON.parse(JSON.stringify(this.defaultCities)).map(v => {
    v.uuid = uuid();
    return v;
  });
  nonSafehavenCities = this.cities.filter(v => v.color !== 'safehaven');
  nonSafehavenCitiesLeadingBlank = this.withLeadingBlank(this.nonSafehavenCities);
  selectedCityId;
  selectedInfectionId;

  topDeckHistory = [[]];
  topDeckHistoryLeadingBlank = this.withLeadingBlank(this.topDeckHistory);

  partitionBags = [];

  infectionRate = 2;

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
  }

  async infectCity(cityName = null) {
    cityName = cityName || this.selectedCityId;
    const topDeck: any = this.topDeckHistory.slice(-1)[0]; // last array in topDeckHistory
    let topDeckCity = topDeck.find((v: any) => v.name === cityName);
    if (!topDeckCity) {
      topDeckCity = {name: cityName, count: 0};
      topDeck.push(topDeckCity);
    }

    if (topDeckCity.count < this.cities.find(v => v.name === topDeckCity.name).extantCount) {
      topDeckCity.count++;
    }

    this.recomputeBags('infectCity');

    await this.save();
    this.detectChanges();
  }

  async nextRound() {
    const alert = await this.alertCtrl.create({
      header: 'Next Round',
      message: 'Are you sure you want to start the next round?',
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
            const whichCard = await this.whichCardWasDrawnFromBottom();
            if (whichCard) {
              this.selectedCityId = whichCard;
              await this.infectCity();
              this.topDeckHistory.push([]);
              this.updateDerivedArrays();

              await this.save();
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

    this.updateDerivedArrays();
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

  resetGame() {
    this.topDeckHistory = [[]];
    this.updateDerivedArrays();
    this.recomputeBags('resetGame');
    this.save();
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

              this.updateDerivedArrays();
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
      message: `Are you sure you want Delete the row for "${this.selectedInfectionId}"?`,
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

            this.cities = this.cities.filter(v => v.name !== this.selectedInfectionId);

            this.updateDerivedArrays();
            await this.save();
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

          }
        }
      ]
    });
    await alert.present();
  }

  sortCitiesByName(a, b) {
    return a.name < b.name ? -1 : +1 ;
  }

  updateDerivedArrays() {
    this.cities.sort(this.sortCitiesByName.bind(this));
    this.nonSafehavenCities = this.cities.filter(v => v.color !== 'safehaven');
    this.nonSafehavenCitiesLeadingBlank = this.withLeadingBlank(this.nonSafehavenCities);

    this.topDeckHistoryLeadingBlank = this.withLeadingBlank(this.topDeckHistory);
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

}
