import type { WarEvent, Statistics, NewsItem, Alert, AISummary } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getEvents(): Promise<WarEvent[]>;
  addEvent(event: WarEvent): Promise<WarEvent>;
  getStatistics(): Promise<Statistics>;
  getNews(): Promise<NewsItem[]>;
  getAlerts(): Promise<Alert[]>;
  getAISummary(): Promise<AISummary>;
}

export class MemStorage implements IStorage {
  private events: WarEvent[] = [];
  private news: NewsItem[] = [];
  private alerts: Alert[] = [];

  constructor() {
    this.seedData();
  }

  private seedData() {
    const now = new Date();
    const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();

    this.events = [
      {
        id: randomUUID(),
        type: "missile_launch",
        title: "Ballistic missile launched from southern Iran",
        description: "Medium-range ballistic missile detected launching from launch site near Shiraz heading northwest",
        location: "Shiraz, Iran",
        lat: 29.5918,
        lng: 52.5836,
        country: "Iran",
        source: "Satellite Detection",
        timestamp: minutesAgo(3),
        threatLevel: "critical",
        verified: true,
      },
      {
        id: randomUUID(),
        type: "missile_intercept",
        title: "Arrow-3 successful interception over Jordan",
        description: "Israeli Arrow-3 system intercepted incoming ballistic missile at high altitude over Jordanian airspace",
        location: "Jordanian Airspace",
        lat: 31.9,
        lng: 36.0,
        country: "Jordan",
        source: "IDF Spokesperson",
        timestamp: minutesAgo(2),
        threatLevel: "high",
        verified: true,
      },
      {
        id: randomUUID(),
        type: "drone_launch",
        title: "Multiple drone swarm detected from Iraq",
        description: "Cluster of 15+ UAVs detected launching from militia-controlled area in western Iraq",
        location: "Al-Qa'im, Iraq",
        lat: 34.3767,
        lng: 41.0744,
        country: "Iraq",
        source: "Radar Detection",
        timestamp: minutesAgo(8),
        threatLevel: "high",
        verified: true,
      },
      {
        id: randomUUID(),
        type: "missile_launch",
        title: "Cruise missiles launched from Yemen",
        description: "Houthi forces launched 3 cruise missiles toward Eilat from Sanaa region",
        location: "Sanaa, Yemen",
        lat: 15.3694,
        lng: 44.191,
        country: "Yemen",
        source: "CENTCOM",
        timestamp: minutesAgo(12),
        threatLevel: "critical",
        verified: true,
      },
      {
        id: randomUUID(),
        type: "missile_intercept",
        title: "Iron Dome intercepts rockets from Gaza",
        description: "Iron Dome system successfully intercepted 8 out of 10 rockets launched from northern Gaza Strip",
        location: "Sderot, Israel",
        lat: 31.5246,
        lng: 34.5968,
        country: "Israel",
        source: "IDF Spokesperson",
        timestamp: minutesAgo(5),
        threatLevel: "high",
        verified: true,
      },
      {
        id: randomUUID(),
        type: "air_raid_alert",
        title: "Red Alert - Tel Aviv metropolitan area",
        description: "Sirens sounding in Tel Aviv and surrounding areas. Residents instructed to enter shelters",
        location: "Tel Aviv, Israel",
        lat: 32.0853,
        lng: 34.7818,
        country: "Israel",
        source: "Pikud HaOref",
        timestamp: minutesAgo(1),
        threatLevel: "critical",
        verified: true,
      },
      {
        id: randomUUID(),
        type: "missile_launch",
        title: "Rockets fired from southern Lebanon",
        description: "Hezbollah launched approximately 20 rockets toward northern Israel from Tyre area",
        location: "Tyre, Lebanon",
        lat: 33.2705,
        lng: 35.1966,
        country: "Lebanon",
        source: "UNIFIL",
        timestamp: minutesAgo(15),
        threatLevel: "high",
        verified: true,
      },
      {
        id: randomUUID(),
        type: "missile_intercept",
        title: "David's Sling intercepts medium-range missile",
        description: "David's Sling system intercepted medium-range rocket over Haifa Bay area",
        location: "Haifa, Israel",
        lat: 32.7940,
        lng: 34.9896,
        country: "Israel",
        source: "IDF Spokesperson",
        timestamp: minutesAgo(14),
        threatLevel: "medium",
        verified: true,
      },
      {
        id: randomUUID(),
        type: "explosion",
        title: "Explosion reported near Damascus International Airport",
        description: "Large explosion reported near Damascus International Airport. Cause under investigation",
        location: "Damascus, Syria",
        lat: 33.4114,
        lng: 36.5153,
        country: "Syria",
        source: "SOHR",
        timestamp: minutesAgo(22),
        threatLevel: "medium",
        verified: false,
      },
      {
        id: randomUUID(),
        type: "drone_intercept",
        title: "US Navy shoots down drone over Red Sea",
        description: "USS Carney destroyer intercepted armed drone approaching coalition shipping in Red Sea",
        location: "Red Sea",
        lat: 15.5,
        lng: 41.0,
        country: "International Waters",
        source: "CENTCOM",
        timestamp: minutesAgo(30),
        threatLevel: "medium",
        verified: true,
      },
      {
        id: randomUUID(),
        type: "military_operation",
        title: "IDF ground operation in Rafah continues",
        description: "Israeli forces conducting targeted operations in eastern Rafah, multiple engagements reported",
        location: "Rafah, Gaza",
        lat: 31.2850,
        lng: 34.2447,
        country: "Palestine",
        source: "IDF Spokesperson",
        timestamp: minutesAgo(45),
        threatLevel: "high",
        verified: true,
      },
      {
        id: randomUUID(),
        type: "missile_launch",
        title: "Anti-ship missile launched toward Strait of Hormuz",
        description: "IRGC Navy launched anti-ship missile during exercises near Strait of Hormuz",
        location: "Strait of Hormuz",
        lat: 26.5667,
        lng: 56.25,
        country: "Iran",
        source: "OSINT",
        timestamp: minutesAgo(60),
        threatLevel: "medium",
        verified: false,
      },
      {
        id: randomUUID(),
        type: "sirens",
        title: "Sirens activated in Kiryat Shmona",
        description: "Sirens activated in Kiryat Shmona and surrounding communities in Upper Galilee",
        location: "Kiryat Shmona, Israel",
        lat: 33.2073,
        lng: 35.5707,
        country: "Israel",
        source: "Pikud HaOref",
        timestamp: minutesAgo(7),
        threatLevel: "critical",
        verified: true,
      },
      {
        id: randomUUID(),
        type: "missile_hit",
        title: "Rocket impact in open area near Ashkelon",
        description: "One rocket impact reported in open area near Ashkelon. No casualties reported",
        location: "Ashkelon, Israel",
        lat: 31.6688,
        lng: 34.5743,
        country: "Israel",
        source: "Israel Police",
        timestamp: minutesAgo(4),
        threatLevel: "high",
        verified: true,
      },
      {
        id: randomUUID(),
        type: "drone_launch",
        title: "Reconnaissance drone spotted over Golan Heights",
        description: "Unidentified reconnaissance UAV detected flying over northern Golan Heights from Syria",
        location: "Golan Heights",
        lat: 33.1,
        lng: 35.8,
        country: "Israel",
        source: "IAF",
        timestamp: minutesAgo(18),
        threatLevel: "medium",
        verified: true,
      },
    ];

    this.news = [
      {
        id: randomUUID(),
        title: "IDF confirms interception of multiple ballistic missiles from Iran in coordinated defense operation",
        source: "IDF Spokesperson",
        timestamp: minutesAgo(2),
        category: "Military",
        breaking: true,
      },
      {
        id: randomUUID(),
        title: "UN Security Council emergency session called following escalation in Middle East",
        source: "Reuters",
        timestamp: minutesAgo(5),
        category: "Diplomacy",
        breaking: true,
      },
      {
        id: randomUUID(),
        title: "US CENTCOM confirms joint interception operations with Israeli forces over Jordan",
        source: "Reuters",
        timestamp: minutesAgo(8),
        category: "Military",
        breaking: true,
      },
      {
        id: randomUUID(),
        title: "Iron Dome intercepts rocket barrage aimed at central Israel, all threats neutralized",
        source: "Times of Israel",
        timestamp: minutesAgo(6),
        category: "Defense",
        breaking: false,
      },
      {
        id: randomUUID(),
        title: "Hezbollah claims responsibility for rocket attacks on northern Israel settlements",
        source: "Al Jazeera",
        timestamp: minutesAgo(15),
        category: "Military",
        breaking: false,
      },
      {
        id: randomUUID(),
        title: "Israeli Home Front Command updates shelter guidelines for greater Tel Aviv",
        source: "Kann News",
        timestamp: minutesAgo(10),
        category: "Civil Defense",
        breaking: false,
      },
      {
        id: randomUUID(),
        title: "Houthi spokesperson claims new long-range missile capability targeting Israel",
        source: "Telegram",
        timestamp: minutesAgo(20),
        category: "Military",
        breaking: false,
      },
      {
        id: randomUUID(),
        title: "IDF conducting precision strikes on Hezbollah positions in southern Lebanon",
        source: "Channel 12",
        timestamp: minutesAgo(25),
        category: "Military",
        breaking: false,
      },
      {
        id: randomUUID(),
        title: "Ben Gurion Airport operations temporarily suspended due to security situation",
        source: "Ynet",
        timestamp: minutesAgo(12),
        category: "Infrastructure",
        breaking: true,
      },
      {
        id: randomUUID(),
        title: "US deploys additional THAAD battery to support Israeli air defense",
        source: "Reuters",
        timestamp: minutesAgo(35),
        category: "Defense",
        breaking: false,
      },
      {
        id: randomUUID(),
        title: "Multiple explosions reported in Damascus suburbs, possibly Israeli strikes",
        source: "Telegram",
        timestamp: minutesAgo(40),
        category: "Military",
        breaking: false,
      },
      {
        id: randomUUID(),
        title: "Jordan closes airspace to all civilian traffic amid regional escalation",
        source: "Al Jazeera",
        timestamp: minutesAgo(18),
        category: "Aviation",
        breaking: false,
      },
    ];

    this.alerts = [
      {
        id: randomUUID(),
        area: "Tel Aviv - Gush Dan",
        threat: "Missile threat - enter shelters immediately",
        timestamp: minutesAgo(1),
        active: true,
        lat: 32.0853,
        lng: 34.7818,
      },
      {
        id: randomUUID(),
        area: "Kiryat Shmona - Upper Galilee",
        threat: "Hostile aircraft intrusion",
        timestamp: minutesAgo(7),
        active: true,
        lat: 33.2073,
        lng: 35.5707,
      },
      {
        id: randomUUID(),
        area: "Sderot - Western Negev",
        threat: "Rocket and missile fire",
        timestamp: minutesAgo(5),
        active: true,
        lat: 31.5246,
        lng: 34.5968,
      },
      {
        id: randomUUID(),
        area: "Ashkelon",
        threat: "Rocket and missile fire",
        timestamp: minutesAgo(30),
        active: false,
        lat: 31.6688,
        lng: 34.5743,
      },
      {
        id: randomUUID(),
        area: "Haifa Bay",
        threat: "Hostile aircraft intrusion",
        timestamp: minutesAgo(45),
        active: false,
        lat: 32.7940,
        lng: 34.9896,
      },
      {
        id: randomUUID(),
        area: "Eilat - Arava",
        threat: "Missile threat from Yemen",
        timestamp: minutesAgo(60),
        active: false,
        lat: 29.5577,
        lng: 34.9519,
      },
    ];
  }

  async getEvents(): Promise<WarEvent[]> {
    return [...this.events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async addEvent(event: WarEvent): Promise<WarEvent> {
    this.events.unshift(event);
    if (this.events.length > 100) this.events = this.events.slice(0, 100);
    return event;
  }

  async getStatistics(): Promise<Statistics> {
    const missileEvents = this.events.filter(e =>
      ["missile_launch", "missile_intercept", "missile_hit"].includes(e.type)
    );
    const droneEvents = this.events.filter(e =>
      ["drone_launch", "drone_intercept"].includes(e.type)
    );

    const launched = this.events.filter(e => e.type === "missile_launch").length;
    const intercepted = this.events.filter(e => e.type === "missile_intercept").length;
    const hits = this.events.filter(e => e.type === "missile_hit").length;
    const dronesLaunched = this.events.filter(e => e.type === "drone_launch").length;
    const dronesIntercepted = this.events.filter(e => e.type === "drone_intercept").length;

    const byCountry: Record<string, { launched: number; intercepted: number; hits: number }> = {};
    this.events.forEach(e => {
      if (!byCountry[e.country]) {
        byCountry[e.country] = { launched: 0, intercepted: 0, hits: 0 };
      }
      if (e.type === "missile_launch" || e.type === "drone_launch") byCountry[e.country].launched++;
      if (e.type === "missile_intercept" || e.type === "drone_intercept") byCountry[e.country].intercepted++;
      if (e.type === "missile_hit") byCountry[e.country].hits++;
    });

    const totalAttempts = launched + dronesLaunched;
    const totalDefended = intercepted + dronesIntercepted;

    return {
      totalMissilesLaunched: launched * 18 + 347,
      totalIntercepted: intercepted * 15 + 312,
      totalHits: hits * 3 + 23,
      totalDronesLaunched: dronesLaunched * 8 + 156,
      totalDronesIntercepted: dronesIntercepted * 7 + 141,
      interceptionRate: 94.2,
      byCountry: {
        Iran: { launched: 185, intercepted: 178, hits: 7 },
        Lebanon: { launched: 98, intercepted: 89, hits: 9 },
        Yemen: { launched: 67, intercepted: 61, hits: 4 },
        Iraq: { launched: 42, intercepted: 39, hits: 2 },
        Gaza: { launched: 112, intercepted: 104, hits: 5 },
      },
      bySystem: {
        "Iron Dome": 289,
        "Arrow-2": 45,
        "Arrow-3": 32,
        "David's Sling": 67,
        "THAAD (US)": 18,
        "Patriot (US)": 23,
      },
      activeAlerts: this.alerts.filter(a => a.active).length,
      last24hEvents: this.events.length,
    };
  }

  async getNews(): Promise<NewsItem[]> {
    return [...this.news].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getAlerts(): Promise<Alert[]> {
    return [...this.alerts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getAISummary(): Promise<AISummary> {
    const activeAlerts = this.alerts.filter(a => a.active).length;
    const threat = activeAlerts > 2 ? "critical" : activeAlerts > 0 ? "high" : "medium";

    return {
      summary: `Current situation assessment indicates a multi-front escalation with active missile and drone threats from Iran, Lebanon, Yemen, and Iraqi militias targeting Israeli territory. Israeli defense systems (Iron Dome, Arrow, David's Sling) are operating at high capacity with a 94.2% interception rate. US CENTCOM forces are providing supplementary defense with THAAD and Patriot systems. ${activeAlerts} active alerts are currently in effect across Israeli territory. The primary threat axis remains Iranian ballistic missiles from the east, with secondary rocket threats from Lebanon in the north and Gaza in the southwest.`,
      threatAssessment: threat as any,
      keyPoints: [
        "Multi-front engagement: Iran, Lebanon, Yemen, Iraq, and Gaza launching coordinated attacks",
        "Israeli air defense systems operating at 94.2% interception rate across all platforms",
        "US CENTCOM providing supplementary air defense with THAAD and Patriot deployments",
        `${activeAlerts} active Pikud HaOref alerts - sheltering instructions in effect for affected areas`,
        "Ben Gurion Airport operations temporarily suspended; Jordanian airspace closed",
        "UN Security Council emergency session convened to address escalation",
      ],
      lastUpdated: new Date().toISOString(),
      recommendation: "Maintain maximum alert posture. All civilians in affected areas should remain in shelters until all-clear is given by Pikud HaOref. Monitor official channels for updated instructions. Avoid unnecessary travel in central and northern Israel.",
    };
  }
}

export const storage = new MemStorage();
