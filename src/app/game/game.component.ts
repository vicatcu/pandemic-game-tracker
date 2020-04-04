import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit {

  cities = [
    {name: 'Coronaville', color: 'safehaven', outbreaksTo: ['New York', 'Covid2020', 'Wuhan', 'London']},
    {name: 'Wuhan', color: 'safehaven', outbreaksTo: ['Coronaville', 'Covid2020', 'Tripoli', 'Istanbul']},
    {name: 'Covid2020', color: 'safehaven', outbreaksTo: ['Wuhan', 'Coronaville', 'Jacksonville', 'Sao Paulo', 'Lagos']},
    {name: 'Chicago', color: 'blue', outbreaksTo: ['Washington']},
    {name: 'New York', color: 'blue', outbreaksTo: ['Washington', 'Jacksonville', 'Coronaville']},
    {name: 'Washington', color: 'blue', outbreaksTo: ['Jacksonville', 'New York']},
    {name: 'Jacksonville', color: 'yellow', outbreaksTo: ['New York', 'Washington', 'Covid2020']},
    {name: 'Sao Paulo', color: 'yellow', outbreaksTo: ['Lagos', 'Covid2020']},
    {name: 'Lagos', color: 'yellow', outbreaksTo: ['Sao Paulo', 'Covid2020']},
    {name: 'London', color: 'blue', outbreaksTo: ['Coronaville']},
    {name: 'Tripoli', color: 'black', outbreaksTo: ['Cairo', 'Wuhan']},
    {name: 'Cairo', color: 'black', outbreaksTo: ['Tripoli', 'Istanbul']},
    {name: 'Istanbul', color: 'black', outbreaksTo: ['Cairo', 'Wuhan']}
  ].sort((a, b) => a.name < b.name ? -1 : +1 );

  nonSafehavenCities = this.cities.filter(v => v.color !== 'safehaven');

  selectedCityId;

  topDeckHistory = [[]];

  constructor() {}

  ngOnInit() {}

  infectCity() {
    const topDeck: any = this.topDeckHistory.slice(-1);
    let topDeckCity = topDeck.find((v: any) => v.name === this.selectedCityId);
    if (!topDeckCity) {
      topDeckCity = {name: this.selectedCityId, count: 0};
      topDeck.push(topDeckCity);
    }
    topDeckCity.count++;
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
}
