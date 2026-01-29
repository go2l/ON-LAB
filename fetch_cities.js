const fs = require('fs');
const path = require('path');

try {
    const data = fs.readFileSync('raw_cities.json', 'utf8');
    const rawCities = JSON.parse(data);
    const cities = rawCities.map(c => ({
        name: c.name,
        lat: parseFloat(c.latt),
        lng: parseFloat(c.long)
    })).filter(c => c.name && !isNaN(c.lat) && !isNaN(c.lng));

    // Sort alphabetical Hebrew
    cities.sort((a, b) => a.name.localeCompare(b.name, 'he'));

    const fileContent = `export interface City {
    name: string;
    lat: number;
    lng: number;
}

export const CITIES: City[] = ${JSON.stringify(cities, null, 4)};
`;

    fs.writeFileSync(path.join(__dirname, 'cities.ts'), fileContent);
    console.log(`Successfully wrote ${cities.length} cities to cities.ts`);

} catch (e) {
    console.error('Error:', e);
}
