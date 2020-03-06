mapboxgl.accessToken = ACCESSTOKEN;

const activeLayers = localStorage.getItem('activeLayers') && JSON.parse(localStorage.getItem('activeLayers')) || {
  confirmed: true,
  unconfirmed: false,
  deceased: true,
  recovered: false,
  suspected: false
}

const buttonMenu = document.getElementById('menu');
for (let group of STATUS_ORDER) {
  if(activeLayers[group] === undefined){
    activeLayers[group] = false;
  }
  buttonMenu.innerHTML += `<button id='layer-toggle-${group}' onclick='toggleLayer("${group}")'>${group}</button>`
  
  const active = activeLayers[group];
  const button = document.getElementById(`layer-toggle-${group}`);

  if (button) {
    if (!active) {
      button.style.backgroundColor = BUTTON_OFF_BACKGROUNDCOLOR;
      button.style.color = BUTTON_OFF_TEXTCOLOR;
    } else {
      button.style.backgroundColor = GROUP_COLORS[group][1];
      button.style.color = GROUP_COLORS[group][3];
    }
  }
}
localStorage.setItem('activeLayers', JSON.stringify(activeLayers));

const all_clusters = `clusters_${STATUS_ORDER[STATUS_ORDER.length - 1]}`;

document.getElementById('layer-toggle-confirmed').style.backgroundColor = GROUP_COLORS.confirmed[0];

const toGeoJson = function (rows) {
  rows = rows || [];

  return {
    "type": "FeatureCollection",
    "crs": {
      "type": "name",
      "properties": {
        "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
      }
    },
    "features": rows.flatMap(function (row, idx) {
      const latLng = row.latLng.replace(/[^0-9\.,]/g, '').split(',');

      return latLng.length > 1 ? [{
        "type": "Feature",
        "properties": {
          "id": idx,
          ...row
        },
        "geometry": {
          "type": "Point",
          "coordinates": [latLng[1], latLng[0], 0.0]
        }
      }]: []
    })
  }
}

const closeHoverPopup = function() {
  if(hoverPopup && typeof hoverPopup.remove === 'function'){
    hoverPopup.remove();
  }
}

let map;
let records;
let hoverPopup;

async function main() {
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v10',
    center: localStorage.getItem('mapCenter') && JSON.parse(localStorage.getItem('mapCenter')) || INITIAL_CENTER,
    zoom: localStorage.getItem('mapZoom') || INITIAL_ZOOM
  });


  map.on('moveend', function () {
    localStorage.setItem('mapCenter', JSON.stringify(map.getCenter().toArray()));
  })

  map.on('zoomend', function () {
    localStorage.setItem('mapZoom', map.getZoom())
  })

  const getStatusFilter = function (status) {
    return ['==', ['get', 'status'], status];
  }

  const tsvRes = await fetch(SHEET_URL);
  const tsvData = await tsvRes.text();
  const rows = tsvData.split('\n').map(function (line) {
    return line.split('\t')
  })

  records = rows.slice(1).map(R.zipObj(rows[0]));
  const includedGroups = {};
  records.forEach(function(r){
    includedGroups[r.status] = true;
  })
  for (let group of STATUS_ORDER) {
    if(!includedGroups[group]){
      document.getElementById(`layer-toggle-${group}`).style.display='none';
    }
  }

  const showPopup = window.showPopup = function(points) {
    if (points.length) {
      var coordinates = points[0].geometry.coordinates.slice();
      const props = Object.keys(points[0].properties);

      new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(`${
          points.length > 1 ? `<h5>${points.length} cases</h5>` : ''
        }<div class='popup-container'>${
          points.sort(function(a,b){
            return STATUS_ORDER.indexOf(a.properties.status) - STATUS_ORDER.indexOf(b.properties.status)
          }).map(function(point) {
            return `<div class='popup-item'>${
            props.map(function (p) {
              let value = point.properties[p];
              if (/^https?:\/\//.test(value)) {
                value = `<a href='${value}' target='_blank'>Link</a>`;
              }
              return `${p}: ${value}`
            }).join('<br/>')}</div>`
          }).join('')}</div>`
        )
        .addTo(map);
    }
  }

  map.on('load', function () {
      const propsDef = {};
      STATUS_ORDER.forEach(function(group){
        propsDef[`${group}_count`] = ['+', ['case', getStatusFilter(group), 1, 0]]
      })

      map.addSource(`records`, {
        type: 'geojson',
        data: toGeoJson(records),
        cluster: true,
        clusterMaxZoom: 22,
        clusterRadius: 50,
        clusterProperties: propsDef
      });

      const reversed = STATUS_ORDER.slice().reverse();
      const decumulator = STATUS_ORDER.map(function(group){return ['get', `${group}_count`]});
      for(let idx = 0; idx <= STATUS_ORDER.length - 1; idx++){
        const group = reversed[idx];
        if(idx == 0) {
          map.addLayer({
            id: `clusters_${group}`,
            type: 'circle',
            source: `records`,
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': ['interpolate',["linear"],['get', `${group}_count`],...GROUP_COLORS[group]],
              'circle-radius': [
                ...CLUSTER_GROWTH,
                ['get', 'point_count'],
                ...CLUSTER_SIZES
              ]
            }
          });
        } else if(idx == `${STATUS_ORDER.length - 1}`){
          map.addLayer({
            id: `clusters_${group}`,
            type: 'circle',
            source: `records`,
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': ['interpolate',["linear"],['get', `${group}_count`],...GROUP_COLORS[group]],
              'circle-radius': [
                ...CLUSTER_GROWTH,
                ['get', `${group}_count`],
                ...CLUSTER_SIZES
              ]
            }
          });
        } else {
          map.addLayer({
            id: `clusters_${group}`,
            type: 'circle',
            source: `records`,
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': ['interpolate',["linear"],['get', `${group}_count`],...GROUP_COLORS[group]],
              'circle-radius': [
                ...CLUSTER_GROWTH,
                ['+', ...decumulator],
                ...CLUSTER_SIZES
              ]
            }
          });
        }
        decumulator.pop();
      }

      map.addLayer({
        id: `cluster_count`,
        type: 'symbol',
        source: `records`,
        filter: ['has', 'point_count'],
        layout: {
          // visibility: activeLayers[group] ? 'visible' : 'none',
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        }
      });

      for (let group of STATUS_ORDER) {
        map.addLayer({
          id: `${group}_points`,
          type: 'circle',
          source: `records`,
          filter: ['==', ['get', 'status'], group],
          layout: {
            visibility: activeLayers[group] ? 'visible' : 'none',
          },
          paint: {
            'circle-color': GROUP_COLORS[group][1],
            'circle-radius': 4,
            'circle-stroke-width': 1,
            'circle-stroke-color': GROUP_COLORS[group][3]
          }
        });
      }

      // inspect a cluster on click
      map.on('click', all_clusters, function (e) {
        var clusters = map.queryRenderedFeatures(e.point, {
          layers: STATUS_ORDER.map(function(status){return `clusters_${status}`})
        });
        var clusterId = clusters[0].properties.cluster_id;
        map.getSource('records').getClusterLeaves(
          clusterId,
          100,
          0,
          function(err, points){
            if (err) {
              return console.error('error while getting leaves of a cluster', err);
            }
            
            if(points.every(function(p){
              return p.properties.latLng === points[0].properties.latLng
            })){
              showPopup(points)
              return;
            }

            map.getSource(`records`).getClusterExpansionZoom(
              clusterId,
              function (err, zoom) {
                if (err) return;

                map.easeTo({
                  center: clusters[0].geometry.coordinates,
                  zoom: zoom
                });
              }
            );
          }
    
        );
      });

      map.on('click', function (e) {
        var points = map.queryRenderedFeatures(e.point, {
          layers: STATUS_ORDER.map(function (group) {
            return `${group}_points`
          })
        });
        showPopup(points)
      });

      map.on('mouseenter', all_clusters, function (e) {
        map.getCanvas().style.cursor = 'pointer';
        
        closeHoverPopup();
        const coordinates = e.features[0].geometry.coordinates.slice();
        const props = e.features[0].properties;
        hoverPopup = new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
              ${props.confirmed_count > 0 ? `Confirmed: ${props.confirmed_count}<br/>` : ''}
              ${props.unconfirmed_count > 0 ? `Unconfirmed: ${props.unconfirmed_count}<br/>` : ''}
              ${props.deceased_count > 0 ? `Deceased: ${props.deceased_count}<br/>` : ''}
              ${props.recovered_count > 0 ? `Recovered: ${props.recovered_count}<br/>` : ''}
              ${props.suspected_count > 0 ? `Suspected: ${props.suspected_count}<br/>` : ''}
            `)
            .addTo(map);
      });

      map.on('mouseleave', `clusters`, function () {
        map.getCanvas().style.cursor = '';
        closeHoverPopup();
      });

      map.getSource('records').setData(toGeoJson(records.filter(function(r){return activeLayers[r.status]})))
    }
  );
}

main();

function toggleLayer(group) {
  const active = activeLayers[group];
  const button = document.getElementById(`layer-toggle-${group}`);

  if (active) {
    map.setLayoutProperty(`${group}_points`, 'visibility', 'none');
    button.style.backgroundColor = BUTTON_OFF_BACKGROUNDCOLOR;
    button.style.color = BUTTON_OFF_TEXTCOLOR;
    activeLayers[group] = false;
  } else {
    map.setLayoutProperty(`${group}_points`, 'visibility', 'visible');
    button.style.backgroundColor = GROUP_COLORS[group][1];
    button.style.color = GROUP_COLORS[group][3];
    
    activeLayers[group] = true;
  }

  map.getSource('records').setData(toGeoJson(records.filter(function(r){return activeLayers[r.status]})))
  localStorage.setItem('activeLayers', JSON.stringify(activeLayers));
}