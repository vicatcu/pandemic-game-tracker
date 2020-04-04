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
  constructor(
    private alertCtrl: AlertController,
    private storage: Storage,
    private cdr: ChangeDetectorRef
  ) {
    console.log(this.cities);
    console.log(this.nonSafehavenCities);
    console.log(this.topDeckHistory);
    this.restore();
  }

  ngOnInit() {}

  async infectCity() {
    const topDeck: any = this.topDeckHistory.slice(-1)[0]; // last array in topDeckHistory
    let topDeckCity = topDeck.find((v: any) => v.name === this.selectedCityId);
    if (!topDeckCity) {
      topDeckCity = {name: this.selectedCityId, count: 0};
      topDeck.push(topDeckCity);
    }
    topDeckCity.count++;
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
          text: 'OK',
          handler: async () => {
            this.topDeckHistory.push([]);
            this.topDeckHistoryLeadingBlank = this.withLeadingBlank(this.topDeckHistory);
            await this.save();
          }
        }
      ]
    });
    await alert.present();
  }

  async uninfectCity() {
    const topDeck: any = this.topDeckHistory.slice(-1)[0]; // last array in topDeckHistory
    let topDeckCity = topDeck.find((v: any) => v.name === this.selectedCityId);
    if (!topDeckCity) {
      topDeckCity = {name: this.selectedCityId, count: 0};
      topDeck.push(topDeckCity);
    }
    topDeckCity.count--;
    if (topDeckCity.count < 0) {
      topDeckCity.count = 0;
    }
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
      default: return 'black';
    }
  }

  withLeadingBlank(array) {
    return [''].concat(array);
  }

  async addInfectionCard() {
    const city = this.cities.find(v => v.name === this.selectedInfectionId);
    if (city) {
      if (!city.extantCount) {
        city.extantCount = 0;
      }
      city.extantCount++;
    }
    await this.save();
    this.detectChanges();

    console.log(this.nonSafehavenCitiesLeadingBlank.find((v: any) => v.name === 'Washington'));
  }

  async removeInfectionCard() {
    const city = this.cities.find(v => v.name === this.selectedInfectionId);
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
    this.topDeckHistoryLeadingBlank = this.withLeadingBlank(this.topDeckHistory);

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

    this.cities = this.cities.map(v => {
      v.uuid = uuid();
      return v;
    });

    this.nonSafehavenCities = this.cities.filter(v => v.color !== 'safehaven');
    this.nonSafehavenCitiesLeadingBlank = this.withLeadingBlank(this.nonSafehavenCities);
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
    this.topDeckHistoryLeadingBlank = this.withLeadingBlank(this.topDeckHistory);
    this.save();
  }
}
