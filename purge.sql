DELETE FROM war_events WHERE source IN ('Satellite Detection', 'Radar Detection', 'OSINT', 'IAF', 'Israel Police')
  AND title IN (
    'Ballistic missile launched from southern Iran',
    'Arrow-3 successful interception over Jordan',
    'Multiple drone swarm detected from Iraq',
    'Cruise missiles launched from Yemen',
    'Iron Dome intercepts rockets from Gaza',
    'Red Alert - Tel Aviv metropolitan area',
    'Rockets fired from southern Lebanon',
    'David''s Sling intercepts medium-range missile',
    'Explosion reported near Damascus International Airport',
    'US Navy shoots down drone over Red Sea',
    'IDF ground operation in Rafah continues',
    'Anti-ship missile launched toward Strait of Hormuz',
    'Sirens activated in Kiryat Shmona',
    'Rocket impact in open area near Ashkelon',
    'Reconnaissance drone spotted over Golan Heights'
  );

DELETE FROM news_items WHERE title IN (
    'IDF confirms interception of multiple ballistic missiles from Iran in coordinated defense operation',
    'UN Security Council emergency session called following escalation in Middle East',
    'US CENTCOM confirms joint interception operations with Israeli forces over Jordan',
    'Iron Dome intercepts rocket barrage aimed at central Israel, all threats neutralized',
    'Hezbollah claims responsibility for rocket attacks on northern Israel settlements',
    'Israeli Home Front Command updates shelter guidelines for greater Tel Aviv',
    'Houthi spokesperson claims new long-range missile capability targeting Israel',
    'IDF conducting precision strikes on Hezbollah positions in southern Lebanon',
    'Ben Gurion Airport operations temporarily suspended due to security situation',
    'US deploys additional THAAD battery to support Israeli air defense',
    'Multiple explosions reported in Damascus suburbs, possibly Israeli strikes',
    'Jordan closes airspace to all civilian traffic amid regional escalation'
);

DELETE FROM alerts WHERE area IN (
    'Tel Aviv - Gush Dan',
    'Kiryat Shmona - Upper Galilee',
    'Sderot - Western Negev',
    'Ashkelon',
    'Haifa Bay',
    'Eilat - Arava'
) AND threat IN (
    'Missile threat - enter shelters immediately',
    'Hostile aircraft intrusion',
    'Rocket and missile fire',
    'Missile threat from Yemen'
);
