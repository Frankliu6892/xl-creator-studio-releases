/**
 * Creator Academy-Style 2D Vector Illustration Episodes & Canvas/SVG Renderer
 * Operator-Grade Technical Playbooks for TikTok Shop Creators & Brands (100% Neutral Style)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IllustrationStudio = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const EPISODES = [
    // =========================================================================
    // PHASE 1: ZERO-BUDGET CAMERA & FRAMING ($0 SPENT — 5 MINI-EPISODES)
    // =========================================================================
    {
      id: 'mini-1-1-camera-distance',
      title: 'Mini 1.1: The Arm’s-Length Lens Trap (3–4ft Distance Rule)',
      category: 'Phase 1: Zero-Budget Camera ($0)',
      diagramType: 'lighting',
      lines: [
        {
          beatTitle: 'HOOK: ARM-LENGTH DISTORTION',
          activeElement: 'ring_glare',
          duration: 6.0,
          text: 'Stop holding your phone at arm’s length—wide-angle lenses stretch the center of your face and make your nose look thirty percent larger.'
        },
        {
          beatTitle: 'ONE MOVE: STEP BACK 3–4 FT',
          activeElement: 'key',
          duration: 6.5,
          text: 'Zero-dollar upgrade number one: set your phone on a desk stand or stack of books three to four feet back from your chair.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'final',
          duration: 6.0,
          text: 'That extra distance flattens facial distortion immediately—follow for Part Two where we pair this with optical zoom.'
        }
      ]
    },
    {
      id: 'mini-1-2-optical-zoom',
      title: 'Mini 1.2: 1x Wide vs. 1.5x–2x Optical Zoom (No Digital Crop)',
      category: 'Phase 1: Zero-Budget Camera ($0)',
      diagramType: 'lighting',
      lines: [
        {
          beatTitle: 'HOOK: 1X WIDE VS 1.5X OPTICAL',
          activeElement: 'ring_glare',
          duration: 6.0,
          text: 'Once your camera is three feet back, never pinch-zoom inside a social app—digital crop cuts your resolution in half.'
        },
        {
          beatTitle: 'ONE MOVE: 1.5X–2X OPTICAL ZOOM',
          activeElement: 'key',
          duration: 6.5,
          text: 'Instead, switch to your camera’s native one-point-five or two-X optical lens so the longer focal length compresses your background naturally.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'final',
          duration: 6.0,
          text: 'Your face now looks exactly like a studio portrait lens—in Part Three we align your eye line on the grid.'
        }
      ]
    },
    {
      id: 'mini-1-3-top-third-eyeline',
      title: 'Mini 1.3: The Top-Third Eye-Line Grid Rule (Rule of Thirds)',
      category: 'Phase 1: Zero-Budget Camera ($0)',
      diagramType: 'lighting',
      lines: [
        {
          beatTitle: 'HOOK: DEAD CEILING SPACE',
          activeElement: 'ceiling_off',
          duration: 6.0,
          text: 'Notice how amateur videos always leave a huge gap of empty ceiling above the speaker’s head?'
        },
        {
          beatTitle: 'ONE MOVE: TOP-THIRD GRID LINE',
          activeElement: 'fill',
          duration: 6.5,
          text: 'Turn on your camera’s three-by-three grid and rest your eyes right on the top horizontal third line.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'final',
          duration: 6.0,
          text: 'That keeps your face centered below TikTok’s search bar and above the captions—next up, the two-second lens check.'
        }
      ]
    },
    {
      id: 'mini-1-4-lens-wipe-stabilize',
      title: 'Mini 1.4: The 2-Second Lens Wipe & Stabilization Check',
      category: 'Phase 1: Zero-Budget Camera ($0)',
      diagramType: 'lighting',
      lines: [
        {
          beatTitle: 'HOOK: WHY FOOTAGE LOOKS HAZY',
          activeElement: 'ring_glare',
          duration: 6.0,
          text: 'If your indoor video looks milky or soft around lights, it isn’t a cheap camera—it’s fingerprint oil on your glass.'
        },
        {
          beatTitle: 'ONE MOVE: WIPE + LOCK TRIPOD',
          activeElement: 'key',
          duration: 6.5,
          text: 'Wipe your lens with a clean cloth before every single take and brace the phone on a solid surface so it never micro-shakes.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'final',
          duration: 6.0,
          text: 'Contrast and sharpness jump instantly for zero dollars—in Part Five we stop your brightness from pulsing.'
        }
      ]
    },
    {
      id: 'mini-1-5-ae-af-exposure-lock',
      title: 'Mini 1.5: Locking Exposure (AE/AF Lock) in 2 Seconds',
      category: 'Phase 1: Zero-Budget Camera ($0)',
      diagramType: 'lighting',
      lines: [
        {
          beatTitle: 'HOOK: PULSING BRIGHTNESS',
          activeElement: 'ceiling_off',
          duration: 6.0,
          text: 'Ever watch a video where the screen gets brighter and darker every time the creator moves their hands?'
        },
        {
          beatTitle: 'ONE MOVE: HOLD SCREEN 2 SECONDS',
          activeElement: 'final',
          duration: 6.5,
          text: 'Sit in your spot, press and hold your finger on your face on screen for two seconds until AE-AF Lock pops up, then slide exposure down slightly.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'key',
          duration: 6.0,
          text: 'Your focus and skin exposure are now locked like a cinema camera—next in Phase Two, we fix your lighting for free.'
        }
      ]
    },

    // =========================================================================
    // PHASE 2: ZERO-TO-STUDIO LIGHTING (5 MINI-EPISODES)
    // =========================================================================
    {
      id: 'mini-2-1-kill-ceiling-bulb',
      title: 'Mini 2.1: Turn Off Your Overhead Ceiling Light (3200K Yellow Cast)',
      category: 'Phase 2: Lighting Upgrades',
      diagramType: 'lighting',
      lines: [
        {
          beatTitle: 'HOOK: THE ORANGE SKIN PROBLEM',
          activeElement: 'ceiling_off',
          duration: 6.0,
          text: 'Watch my skin tone the second I flip off my overhead bedroom ceiling light—that one switch is the fastest lighting upgrade on TikTok.'
        },
        {
          beatTitle: 'ONE MOVE: KILL 3200K OVERHEADS',
          activeElement: 'ring_glare',
          duration: 6.5,
          text: 'Household ceiling bulbs burn at thirty-two-hundred Kelvin yellow and shine straight down, casting dark raccoon shadows under your eyes.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'key',
          duration: 6.0,
          text: 'Always switch overhead room lights off before filming—in the next mini episode, we use free window light the right way.'
        }
      ]
    },
    {
      id: 'mini-2-2-window-backlighting-flip',
      title: 'Mini 2.2: Never Film Backlit (The 180° Window Flip)',
      category: 'Phase 2: Lighting Upgrades',
      diagramType: 'lighting',
      lines: [
        {
          beatTitle: 'HOOK: DARK FACE, BLOWN WINDOW',
          activeElement: 'ring_glare',
          duration: 6.0,
          text: 'If you film with a bright window behind your back, your phone exposes for the window and turns your face into a dark shadow.'
        },
        {
          beatTitle: 'ONE MOVE: TURN 180° TO FACE LIGHT',
          activeElement: 'key',
          duration: 6.5,
          text: 'Turn your setup one hundred eighty degrees so you face the window, putting the camera between the natural daylight and your face.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'final',
          duration: 6.0,
          text: 'You get soft, fifty-six-hundred Kelvin daylight for zero dollars—next up, how to angle your light so glasses never glare.'
        }
      ]
    },
    {
      id: 'mini-2-3-45deg-key-light',
      title: 'Mini 2.3: Killing Ring-Light Glare (The 45° Key Light Rule)',
      category: 'Phase 2: Lighting Upgrades',
      diagramType: 'lighting',
      lines: [
        {
          beatTitle: 'HOOK: 0° RING LIGHT GLARE',
          activeElement: 'ring_glare',
          duration: 6.0,
          text: 'Putting a ring light dead-center at zero degrees flattens your face and prints a white glare circle across glasses and glossy products.'
        },
        {
          beatTitle: 'ONE MOVE: 45° SIDE + 45° UP',
          activeElement: 'key',
          duration: 6.5,
          text: 'Move your main light forty-five degrees to the side of your camera and raise it fifteen to forty-five degrees above eye level.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'final',
          duration: 6.0,
          text: 'Glare disappears from your glasses and you get cinematic Rembrandt cheek depth—next, we soften the shadow side.'
        }
      ]
    },
    {
      id: 'mini-2-4-fill-light-balance',
      title: 'Mini 2.4: Adding a 35% Fill Light (Shadow Control Without Glare)',
      category: 'Phase 2: Lighting Upgrades',
      diagramType: 'lighting',
      lines: [
        {
          beatTitle: 'HOOK: ONE-SIDED SHADOWS',
          activeElement: 'key',
          duration: 6.0,
          text: 'Once your main key light is at forty-five degrees, the opposite side of your face falls into shadow.'
        },
        {
          beatTitle: 'ONE MOVE: -45° FILL AT 35%',
          activeElement: 'fill',
          duration: 6.5,
          text: 'Place a second dimmer light—or a white foam board—on the opposite forty-five degree angle at roughly thirty-five percent brightness.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'final',
          duration: 6.0,
          text: 'Because the fill is dimmer than the key, it lifts shadows cleanly without creating a second shadow—next, we add 3D wall depth.'
        }
      ]
    },
    {
      id: 'mini-2-5-wall-depth-rim-light',
      title: 'Mini 2.5: 3-Foot Wall Separation & Rim Backlight (3D Studio Look)',
      category: 'Phase 2: Lighting Upgrades',
      diagramType: 'lighting',
      lines: [
        {
          beatTitle: 'HOOK: UNGLUE FROM THE BACK WALL',
          activeElement: 'ceiling_off',
          duration: 6.0,
          text: 'If your chair sits six inches from a plain wall, your body casts a hard shadow behind you and the room feels cramped.'
        },
        {
          beatTitle: 'ONE MOVE: 3FT GAP + RIM LIGHT',
          activeElement: 'final',
          duration: 6.5,
          text: 'Pull your chair three to four feet away from the back wall and tuck a dimtwenty-five percent backlight behind your shoulders.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'key',
          duration: 6.0,
          text: 'That rim light carves your shoulders out from the blurred background—in Phase Three, we upgrade your studio audio.'
        }
      ]
    },

    // =========================================================================
    // PHASE 3: CRISP AUDIO & RETENTION EDITING (6 MINI-EPISODES)
    // =========================================================================
    {
      id: 'mini-3-1-silent-room-check',
      title: 'Mini 3.1: Turning Off Hidden Room Hum (The 5-Second Sound Check)',
      category: 'Phase 3: Audio & Retention',
      diagramType: 'accelerator',
      lines: [
        {
          beatTitle: 'HOOK: BAD AUDIO LOSES VIEWERS FIRST',
          activeElement: 'triage',
          duration: 6.0,
          text: 'Viewers will tolerate average video, but background hum makes people swipe away in under three seconds.'
        },
        {
          beatTitle: 'ONE MOVE: KILL AC + 5S TEST',
          activeElement: 'disqualifiers',
          duration: 6.5,
          text: 'Before filming, switch off your AC or fan, record a five-second test clip, and listen back on headphones.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'flywheel',
          duration: 6.0,
          text: 'Catching an appliance hum before you roll saves the entire shoot—next up, how to kill room echo for zero dollars.'
        }
      ]
    },
    {
      id: 'mini-3-2-household-soundproofing',
      title: 'Mini 3.2: Zero-Budget Room Soundproofing (Blankets, Rugs & Pillows)',
      category: 'Phase 3: Audio & Retention',
      diagramType: 'accelerator',
      lines: [
        {
          beatTitle: 'HOOK: WHY ROOMS SOUND HOLLOW',
          activeElement: 'triage',
          duration: 6.0,
          text: 'You don’t need foam wall panels to get studio sound—hollow echo comes from your voice bouncing off bare floors and drywall.'
        },
        {
          beatTitle: 'ONE MOVE: SOFT TEXTILES IN FRONT',
          activeElement: 'ctr',
          duration: 6.5,
          text: 'Lay a rug on the floor and drape a heavy blanket or pillows over a chair right behind your camera, just out of frame.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'flywheel',
          duration: 6.0,
          text: 'Soft fabric absorbs the sound waves before they bounce back—next, the exact distance to hold your microphone.'
        }
      ]
    },
    {
      id: 'mini-3-3-six-inch-mic-rule',
      title: 'Mini 3.3: The 6-Inch Microphone Distance Rule (Audio 101)',
      category: 'Phase 3: Audio & Retention',
      diagramType: 'accelerator',
      lines: [
        {
          beatTitle: 'HOOK: TOO CLOSE VS TOO FAR',
          activeElement: 'disqualifiers',
          duration: 6.0,
          text: 'Hold a mic two inches from your mouth and every P and B pops; leave it three feet away and you sound distant.'
        },
        {
          beatTitle: 'ONE MOVE: 6 TO 8 INCHES (15 CM)',
          activeElement: 'ctr',
          duration: 6.5,
          text: 'Clip or position your external mic six to eight inches—about one hand-span—below your chin, angled toward your mouth.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'flywheel',
          duration: 6.0,
          text: 'You get warm broadcast vocal presence with zero clipping—next up, the two-tap post-production audio polish.'
        }
      ]
    },
    {
      id: 'mini-3-4-two-tap-audio-polish',
      title: 'Mini 3.4: Two-Tap Audio Polish & +98% Background Music Lift',
      category: 'Phase 3: Audio & Retention',
      diagramType: 'accelerator',
      lines: [
        {
          beatTitle: 'HOOK: DON’T OVER-STACK FILTERS',
          activeElement: 'triage',
          duration: 6.0,
          text: 'Stacking three or four audio filters makes your voice sound underwater—TikTok Creator Academy recommends only two passes.'
        },
        {
          beatTitle: 'ONE MOVE: NOISE REDUCE + MUSIC BED',
          activeElement: 'ctor',
          duration: 6.5,
          text: 'Run Noise Reduction first, Voice Enhancement second, and tuck a low background music bed underneath at ten percent volume.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'flywheel',
          duration: 6.0,
          text: 'Videos with balanced background music average ninety-eight percent more views—next, we make your video mute-proof.'
        }
      ]
    },
    {
      id: 'mini-3-5-mute-proof-safe-zones',
      title: 'Mini 3.5: The 3-Second Mute-Proof Hook Banner (30% Watch on Mute)',
      category: 'Phase 3: Audio & Retention',
      diagramType: 'accelerator',
      lines: [
        {
          beatTitle: 'HOOK: 30% SCROLL ON MUTE',
          activeElement: 'triage',
          duration: 6.0,
          text: 'Over thirty percent of TikTok users browse with their sound muted—if your first three seconds have no headline, they swipe.'
        },
        {
          beatTitle: 'ONE MOVE: SAFE-ZONE HOOK CARD',
          activeElement: 'ctr',
          duration: 6.5,
          text: 'Place a bold three-second hook banner below the top search bar and above your hairline, plus synced captions above the bottom description.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'flywheel',
          duration: 6.0,
          text: 'Nothing gets blocked by TikTok’s interface buttons—next up, the hidden upload toggle that unlocks full 1080p.'
        }
      ]
    },
    {
      id: 'mini-3-6-hd-upload-toggle',
      title: 'Mini 3.6: The Hidden "Allow High-Quality Uploads" Toggle (1080p Rule)',
      category: 'Phase 3: Audio & Retention',
      diagramType: 'accelerator',
      lines: [
        {
          beatTitle: 'HOOK: WHY 1080P POSTS LOOK BLURRY',
          activeElement: 'disqualifiers',
          duration: 6.0,
          text: 'Ever export a crystal-clear 1080p video, upload it to TikTok, and watch it turn blocky and compressed?'
        },
        {
          beatTitle: 'ONE MOVE: MORE OPTIONS -> HD TOGGLE',
          activeElement: 'ctor',
          duration: 6.5,
          text: 'Before hitting post, scroll down to More Options and toggle on Allow High-Quality Uploads.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'flywheel',
          duration: 6.0,
          text: 'High-quality posts earn seventy-two percent more watch time per view—now in Phase Four, let’s monetize this studio.'
        }
      ]
    },

    // =========================================================================
    // PHASE 4: HOBBY TO CAREER — SEO, MONETIZATION & BUSINESS (8 MINI-EPISODES)
    // =========================================================================
    {
      id: 'mini-4-1-retention-drop-diagnosis',
      title: 'Mini 4.1: Reading Your 3-Second Retention Graph in TikTok Studio',
      category: 'Phase 4: Hobby to Career (Monetization)',
      diagramType: 'accelerator',
      lines: [
        {
          beatTitle: 'HOOK: STOP GUESSING WHY VIEWS STALL',
          activeElement: 'triage',
          duration: 6.0,
          text: 'When a video stalls at two hundred views, don’t blame the algorithm—open that post’s Retention Rate graph in TikTok Studio.'
        },
        {
          beatTitle: 'ONE MOVE: CHECK THE 0:02 DROP',
          activeElement: 'disqualifiers',
          duration: 6.5,
          text: 'If the line drops steeply at two seconds, cut your greeting preamble on the next video and open directly with the visual payoff.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'flywheel',
          duration: 6.0,
          text: 'Fixing that first three-second cliff is how you unlock the For You feed—next, how to find guaranteed search traffic.'
        }
      ]
    },
    {
      id: 'mini-4-2-creator-search-content-gaps',
      title: 'Mini 4.2: Finding High-Demand "Content Gaps" in Creator Search Insights',
      category: 'Phase 4: Hobby to Career (Monetization)',
      diagramType: 'accelerator',
      lines: [
        {
          beatTitle: 'HOOK: HIGH DEMAND, LOW SUPPLY',
          activeElement: 'triage',
          duration: 6.0,
          text: 'Want views that keep coming in for months? Stop guessing topics and search Creator Search Insights inside TikTok.'
        },
        {
          beatTitle: 'ONE MOVE: TAP CONTENT GAP TAB',
          activeElement: 'ctr',
          duration: 6.5,
          text: 'Tap the Content Gap filter to see exact questions thousands of people are searching for that lack high-quality videos.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'flywheel',
          duration: 6.0,
          text: 'Answering one Content Gap query puts your video at the top of search results—next, where to place the keyword.'
        }
      ]
    },
    {
      id: 'mini-4-3-three-point-search-seo',
      title: 'Mini 4.3: The 3-Place TikTok Search SEO Alignment Rule',
      category: 'Phase 4: Hobby to Career (Monetization)',
      diagramType: 'accelerator',
      lines: [
        {
          beatTitle: 'HOOK: HOW TIKTOK INDEXES VIDEOS',
          activeElement: 'ctr',
          duration: 6.0,
          text: 'Once you pick a topic from Creator Search Insights, how does TikTok know to rank your video number one?'
        },
        {
          beatTitle: 'ONE MOVE: BANNER + VOICE + CAPTION',
          activeElement: 'ctor',
          duration: 6.5,
          text: 'Put that exact search phrase in three places: your on-screen hook banner, your spoken first sentence, and the first line of your caption.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'flywheel',
          duration: 6.0,
          text: 'Plus, Search views over thirty seconds directly boost your Creator Rewards payout—let’s break down that payout next.'
        }
      ]
    },
    {
      id: 'mini-4-4-crp-additional-reward',
      title: 'Mini 4.4: Creator Rewards 101 (Standard vs. Additional Reward Bonus)',
      category: 'Phase 4: Hobby to Career (Monetization)',
      diagramType: 'monetization',
      lines: [
        {
          beatTitle: 'HOOK: TWO PAYOUT TIERS ON 1M+ VIDEOS',
          activeElement: 'audit',
          duration: 6.0,
          text: 'Fifty percent of TikTok watch time is now on videos over one minute, and Creator Rewards pays you in two separate tiers.'
        },
        {
          beatTitle: 'ONE MOVE: UNLOCK ADDITIONAL REWARD',
          activeElement: 'commissions',
          duration: 6.5,
          text: 'Standard Reward pays for qualified five-second views, while Additional Reward adds a bonus multiplier when your video is 1080p, specialized, and well-crafted.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'spark',
          duration: 6.0,
          text: 'Every studio upgrade we built in Phases One through Three qualifies you for that bonus—next, what controls your RPM.'
        }
      ]
    },
    {
      id: 'mini-4-5-rpm-commercial-value',
      title: 'Mini 4.5: Audience Commercial Value & The 4 RPM Drivers',
      category: 'Phase 4: Hobby to Career (Monetization)',
      diagramType: 'monetization',
      lines: [
        {
          beatTitle: 'HOOK: WHY TWO VIDEOS EARN DIFFERENT RPM',
          activeElement: 'audit',
          duration: 6.0,
          text: 'Why does one creator earn thirty cents per thousand views while another earns two dollars on the exact same view count?'
        },
        {
          beatTitle: 'ONE MOVE: 4 METRICS + BUYER INTENT',
          activeElement: 'commissions',
          duration: 6.5,
          text: 'Your RPM is driven by watch time, retention, completion rate, Search Value, and Audience Commercial Value—topics that attract adult buyers.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'spark',
          duration: 6.0,
          text: 'Check Age Distribution in your Creator Rewards dashboard to spot your highest-RPM topics—next, adding TikTok Shop.'
        }
      ]
    },
    {
      id: 'mini-4-6-shop-open-vs-target',
      title: 'Mini 4.6: TikTok Shop Affiliate (8% Open vs. 22% Target Links)',
      category: 'Phase 4: Hobby to Career (Monetization)',
      diagramType: 'monetization',
      lines: [
        {
          beatTitle: 'HOOK: DON’T SETTLE FOR 8% LINKS',
          activeElement: 'commissions',
          duration: 6.0,
          text: 'When you add a TikTok Shop product link to your video, never settle for the default public Open Collaboration rate.'
        },
        {
          beatTitle: 'ONE MOVE: REQUEST PARTNER TARGET LINKS',
          activeElement: 'trap',
          duration: 6.5,
          text: 'Public Open links usually pay eight percent, while Partner Target Collaboration links on the exact same SKU pay eighteen to twenty-five percent.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'spark',
          duration: 6.0,
          text: 'You double your commission on the exact same video views—next up, how to get brands to fund your views with Spark Ads.'
        }
      ]
    },
    {
      id: 'mini-4-7-spark-ads-commercial-audio',
      title: 'Mini 4.7: Commercial Music Library & 365-Day Spark Ad Codes',
      category: 'Phase 4: Hobby to Career (Monetization)',
      diagramType: 'monetization',
      lines: [
        {
          beatTitle: 'HOOK: THE COPYRIGHTED AUDIO MISTAKE',
          activeElement: 'audio',
          duration: 6.0,
          text: 'One mistake blocks brands from paying to boost your product video: using a trending pop song instead of Commercial Audio.'
        },
        {
          beatTitle: 'ONE MOVE: COMMERCIAL SOUND + SPARK CODE',
          activeElement: 'spark',
          duration: 6.5,
          text: 'Use TikTok’s Commercial Music Library, show the product in the first three seconds, and send the brand a three-sixty-five day Spark Ad code.'
        },
        {
          beatTitle: 'PAYOFF + NEXT MINI EPISODE',
          activeElement: 'commissions',
          duration: 6.0,
          text: 'Now the brand puts ad budget behind your post while you collect the affiliate sales—finally, let’s take this studio LIVE.'
        }
      ]
    },
    {
      id: 'mini-4-8-live-pin-rotation-service-plus',
      title: 'Mini 4.8: $50+ GPM TikTok LIVE Pin Rotation & Service+ Lead Gen',
      category: 'Phase 4: Hobby to Career (Monetization)',
      diagramType: 'live',
      lines: [
        {
          beatTitle: 'HOOK: TURN YOUR STUDIO INTO LIVE REVENUE',
          activeElement: 'bag',
          duration: 6.0,
          text: 'Once your lighting and mic are dialed in, going LIVE turns your studio into a real-time storefront and client funnel.'
        },
        {
          beatTitle: 'ONE MOVE: 3–5 MIN RE-PIN + SERVICE+ LEADS',
          activeElement: 'repin',
          duration: 6.5,
          text: 'Re-pin your hero product every three to five minutes to trigger the orange cart banner, or enable Service-Plus Lead Generation to capture B2B clients.'
        },
        {
          beatTitle: 'SERIES FINALE PAYOFF',
          activeElement: 'safezone',
          duration: 6.0,
          text: 'That is how you go from a bare-minimum phone setup to a full-time studio career—save this playlist and start with Mini One-Point-One!'
        }
      ]
    }
  ];

  function buildKaraokePhrases(text) {
    const rawWords = String(text || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const phrases = [];
    let i = 0;
    while (i < rawWords.length) {
      let count = 3;
      const w0 = rawWords[i] || '';
      const w1 = rawWords[i + 1] || '';
      if (/[.,!?;:—-]$/.test(w0)) {
        count = 2;
      } else if (/[.,!?;:—-]$/.test(w1) || w0.length + w1.length > 12) {
        count = 2;
      }
      const slice = rawWords.slice(i, i + count);
      phrases.push({
        startWordIdx: i,
        endWordIdx: i + slice.length - 1,
        words: slice
      });
      i += slice.length;
    }
    return { totalWords: rawWords.length, rawWords, phrases };
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function drawBadgeTag(ctx, x, y, text, bgColor, textColor, borderColor) {
    ctx.save();
    ctx.font = '800 24px "Poppins", "Segoe UI", Arial, sans-serif';
    const w = Math.max(150, Math.round(ctx.measureText(text).width + 36));
    const h = 46;
    roundRectPath(ctx, x - w / 2, y - h / 2, w, h, 12);
    ctx.fillStyle = bgColor || '#0F1418';
    ctx.fill();
    if (borderColor) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = textColor || '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  /**
   * EPISODE 1: 45° Glare-Free Product Lighting & 5600K Rule
   * Beats 0-4 show specific technical overlays on top of the Creator Academy overhead studio diagram
   */
  function drawLightingDiagram(ctx, beatIndex, beatProgress, timeSec) {
    const pulse = 0.5 + 0.5 * Math.sin(timeSec * 5.2);

    const showKey = beatIndex >= 1;
    const showFill = beatIndex >= 1;
    const showBack = beatIndex >= 2;

    ctx.save();

    // 1. White Seamless Backdrop Sweep
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(255, 424);
    ctx.lineTo(825, 424);
    ctx.quadraticCurveTo(790, 560, 815, 910);
    ctx.lineTo(265, 910);
    ctx.quadraticCurveTo(290, 560, 255, 424);
    ctx.closePath();
    ctx.fillStyle = beatIndex === 0 ? '#FFF7D6' : '#FFFFFF';
    ctx.fill();

    const leftGrad = ctx.createLinearGradient(255, 424, 345, 424);
    leftGrad.addColorStop(0, 'rgba(15, 23, 30, 0.18)');
    leftGrad.addColorStop(0.5, 'rgba(15, 23, 30, 0.06)');
    leftGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = leftGrad;
    ctx.fill();

    const rightGrad = ctx.createLinearGradient(825, 424, 735, 424);
    rightGrad.addColorStop(0, 'rgba(15, 23, 30, 0.18)');
    rightGrad.addColorStop(0.5, 'rgba(15, 23, 30, 0.06)');
    rightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = rightGrad;
    ctx.fill();

    const botGrad = ctx.createLinearGradient(540, 845, 540, 915);
    botGrad.addColorStop(0, 'rgba(186, 242, 236, 0)');
    botGrad.addColorStop(1, 'rgba(186, 242, 236, 0.92)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(250, 845, 580, 75);
    ctx.restore();

    // 2. Backdrop Stand Crossbar & Side Tripods
    ctx.save();
    ctx.strokeStyle = '#0F1418';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(234, 424);
    ctx.lineTo(244, 520);
    ctx.moveTo(240, 492);
    ctx.lineTo(206, 530);
    ctx.moveTo(240, 492);
    ctx.lineTo(260, 504);
    ctx.moveTo(212, 464);
    ctx.lineTo(238, 464);
    ctx.moveTo(212, 456);
    ctx.lineTo(212, 472);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(846, 424);
    ctx.lineTo(836, 520);
    ctx.moveTo(840, 492);
    ctx.lineTo(874, 530);
    ctx.moveTo(840, 492);
    ctx.lineTo(820, 504);
    ctx.moveTo(868, 464);
    ctx.lineTo(842, 464);
    ctx.moveTo(868, 456);
    ctx.lineTo(868, 472);
    ctx.stroke();

    roundRectPath(ctx, 212, 412, 656, 16, 8);
    ctx.fillStyle = '#9CEAE2';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#0F1418';
    ctx.stroke();

    ctx.fillStyle = '#0F1418';
    roundRectPath(ctx, 210, 410, 32, 20, 5);
    ctx.fill();
    roundRectPath(ctx, 838, 410, 32, 20, 5);
    ctx.fill();
    ctx.restore();

    // 3. Dynamic Cast Shadow Behind Subject
    ctx.save();
    let shadowOffsetX = 0;
    let shadowAlpha = 0.14;
    if (beatIndex === 2) {
      shadowOffsetX = -34;
      shadowAlpha = 0.28;
    } else if (beatIndex >= 3) {
      shadowOffsetX = -8;
      shadowAlpha = 0.12;
    }
    const shGrad = ctx.createRadialGradient(
      532 + shadowOffsetX,
      565,
      10,
      532 + shadowOffsetX,
      565,
      78
    );
    shGrad.addColorStop(0, `rgba(15, 23, 30, ${shadowAlpha})`);
    shGrad.addColorStop(1, 'rgba(15, 23, 30, 0)');
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    ctx.ellipse(532 + shadowOffsetX, 565, 58, 72, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Back Light Rim Glow + 3FT Depth Arrow on Beat 4
    if (showBack) {
      ctx.save();
      const rimGrad = ctx.createRadialGradient(535, 610, 28, 535, 610, 95);
      rimGrad.addColorStop(0, 'rgba(37, 244, 238, 0.55)');
      rimGrad.addColorStop(1, 'rgba(37, 244, 238, 0)');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(535, 610, 95, 0, Math.PI * 2);
      ctx.fill();

      // 3 FT Separation Double Arrow between Backdrop (y=435) and Subject (y=585)
      ctx.strokeStyle = '#0F1418';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(395, 442);
      ctx.lineTo(395, 595);
      ctx.stroke();
      ctx.setLineDash([]);
      drawBadgeTag(ctx, 395, 518, '3 FT DEPTH', '#0F1418', '#FFE600', '#9CEAE2');
      ctx.restore();
    }

    // 5. Creator / Subject (Top-Down View in Red Shirt)
    const bobY = Math.sin(timeSec * 3.0) * 2.5;
    ctx.save();
    ctx.translate(532, 632 + bobY);

    ctx.fillStyle = '#180B0E';
    ctx.beginPath();
    ctx.ellipse(0, 38, 34, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F3C1AA';
    ctx.strokeStyle = '#180B0E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(-34, 48, 10, 13, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(34, 48, 10, 13, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#E11937';
    ctx.strokeStyle = '#180B0E';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-46, -12);
    ctx.quadraticCurveTo(0, -28, 46, -12);
    ctx.quadraticCurveTo(58, 16, 42, 44);
    ctx.lineTo(26, 44);
    ctx.quadraticCurveTo(28, 25, 22, 34);
    ctx.quadraticCurveTo(0, 42, -22, 34);
    ctx.quadraticCurveTo(-28, 25, -26, 44);
    ctx.lineTo(-42, 44);
    ctx.quadraticCurveTo(-58, 16, -46, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, 2, 24, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F3C1AA';
    ctx.beginPath();
    ctx.ellipse(0, 4, 23, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#180B0E';
    ctx.stroke();

    ctx.fillStyle = '#1A0A0E';
    ctx.beginPath();
    ctx.arc(0, -2, 23, Math.PI * 0.92, Math.PI * 2.08);
    ctx.quadraticCurveTo(0, 12, -23, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // BEAT 0 SPECIFIC OVERLAY: 3200K Yellow Ceiling Bulb OFF X-Mark
    if (beatIndex === 0) {
      ctx.save();
      // Warm orange pollution halo
      const warmGrad = ctx.createRadialGradient(532, 510, 15, 532, 510, 145);
      warmGrad.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
      warmGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = warmGrad;
      ctx.beginPath();
      ctx.arc(532, 510, 145, 0, Math.PI * 2);
      ctx.fill();

      // Bulb icon at (532, 495) with bold Red X
      ctx.beginPath();
      ctx.arc(532, 495, 34, 0, Math.PI * 2);
      ctx.fillStyle = '#FBBF24';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0F1418';
      ctx.stroke();

      ctx.strokeStyle = '#E11937';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(492, 455);
      ctx.lineTo(572, 535);
      ctx.moveTo(572, 455);
      ctx.lineTo(492, 535);
      ctx.stroke();

      drawBadgeTag(ctx, 532, 365, '3200K CEILING BULB = OFF', '#2B080C', '#FFE600', '#FF3355');
      ctx.restore();
    }

    // BEAT 1 SPECIFIC OVERLAY: 0° Ring Light Glare Bounce on Glossy Bottle
    if (beatIndex === 1) {
      ctx.save();
      // Glossy Bottle / Tumbler in front of creator at (538, 735)
      roundRectPath(ctx, 516, 708, 44, 62, 10);
      ctx.fillStyle = '#0F1418';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.stroke();

      // White glare ring reflection on bottle
      ctx.strokeStyle = '#FFE600';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(538, 738, 12, 0, Math.PI * 2);
      ctx.stroke();

      // 0° Ring light circle right on the camera lens + harsh red bounce arrows back into lens
      ctx.strokeStyle = '#E11937';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(546, 855, 32, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 7;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(532, 820);
      ctx.lineTo(532, 772);
      ctx.moveTo(552, 772);
      ctx.lineTo(552, 820);
      ctx.stroke();
      ctx.setLineDash([]);

      drawBadgeTag(ctx, 540, 365, '0° RING LIGHT = BOTTLE GLARE ✕', '#2B080C', '#FF3355', '#FF3355');
      ctx.restore();
    }

    // 6. FILL LIGHT (Bottom Left + 3 Red Rays + "FILL" Label + 35% Spec Tag)
    ctx.save();
    const fillAlpha = showFill ? 1.0 : 0.28;
    ctx.globalAlpha = fillAlpha;

    if (showFill) {
      const rays = [
        { x1: 350, y1: 790, x2: 365, y2: 678 },
        { x1: 392, y1: 816, x2: 438, y2: 726 },
        { x1: 418, y1: 862, x2: 498, y2: 840 }
      ];
      ctx.strokeStyle = '#DF1B38';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      rays.forEach((r, idx) => {
        const localScale = 0.82 + 0.18 * Math.sin(timeSec * 6.5 - idx * 0.7);
        const dx = (r.x2 - r.x1) * localScale;
        const dy = (r.y2 - r.y1) * localScale;
        ctx.beginPath();
        ctx.moveTo(r.x1, r.y1);
        ctx.lineTo(r.x1 + dx, r.y1 + dy);
        ctx.stroke();
      });
    }

    ctx.save();
    ctx.translate(306, 892);
    ctx.rotate(-0.56);
    roundRectPath(ctx, -38, 34, 76, 22, 8);
    ctx.fillStyle = '#0F1418';
    ctx.fill();
    roundRectPath(ctx, -56, -42, 112, 84, 16);
    ctx.fillStyle = '#0F1418';
    ctx.fill();
    roundRectPath(ctx, -45, -32, 90, 64, 10);
    ctx.fillStyle = '#A8F5ED';
    ctx.fill();
    roundRectPath(ctx, -18, -14, 36, 28, 6);
    ctx.fillStyle = '#125E63';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#0F1418';
    ctx.font = '800 43px "Poppins", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FILL', 306, 1034);
    if (showFill) {
      drawBadgeTag(ctx, 306, 1082, '45° • 35% OUTPUT', '#0F1418', '#9CEAE2', null);
    }
    ctx.restore();

    // 7. KEY LIGHT (Bottom Right + Reflector Barn Doors + "KEY" Label + 45° / 5600K Spec Tag)
    ctx.save();
    const keyAlpha = showKey ? 1.0 : 0.28;
    ctx.globalAlpha = keyAlpha;

    if (showKey && beatIndex >= 1) {
      const kRays = [
        { x1: 720, y1: 790, x2: 695, y2: 682 },
        { x1: 680, y1: 822, x2: 625, y2: 732 },
        { x1: 656, y1: 866, x2: 582, y2: 842 }
      ];
      ctx.strokeStyle = '#DF1B38';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      kRays.forEach((r, idx) => {
        const localScale = 0.82 + 0.18 * Math.sin(timeSec * 6.5 - idx * 0.7);
        ctx.beginPath();
        ctx.moveTo(r.x1, r.y1);
        ctx.lineTo(r.x1 + (r.x2 - r.x1) * localScale, r.y1 + (r.y2 - r.y1) * localScale);
        ctx.stroke();
      });
    }

    ctx.save();
    ctx.translate(772, 892);
    ctx.rotate(-0.68);
    ctx.fillStyle = '#0F1418';
    ctx.beginPath();
    ctx.moveTo(-26, -20);
    ctx.lineTo(-56, -78);
    ctx.lineTo(28, -58);
    ctx.lineTo(22, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9CEAE2';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-50, -73);
    ctx.lineTo(22, -55);
    ctx.stroke();

    roundRectPath(ctx, -32, -16, 64, 68, 12);
    ctx.fillStyle = '#0F1418';
    ctx.fill();
    ctx.strokeStyle = '#9CEAE2';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-18, 6);
    ctx.lineTo(18, 6);
    ctx.moveTo(-18, 20);
    ctx.lineTo(18, 20);
    ctx.moveTo(-18, 34);
    ctx.lineTo(18, 34);
    ctx.stroke();

    ctx.beginPath();
    roundRectPath(ctx, -16, 52, 32, 16, 5);
    ctx.fillStyle = '#0F1418';
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#0F1418';
    ctx.font = '800 43px "Poppins", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KEY', 804, 1034);
    if (showKey) {
      drawBadgeTag(ctx, 804, 1082, '45° • 5600K • 100%', '#0F1418', '#FFE600', null);
    }
    ctx.restore();

    // 8. BACK LIGHT (Top Right behind creator on Beat 4)
    if (showBack) {
      ctx.save();
      const bRays = [
        { x1: 690, y1: 525, x2: 615, y2: 565 },
        { x1: 705, y1: 552, x2: 625, y2: 602 }
      ];
      ctx.strokeStyle = '#DF1B38';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      bRays.forEach((r, idx) => {
        const localScale = 0.82 + 0.18 * Math.sin(timeSec * 6.5 - idx * 0.7);
        ctx.beginPath();
        ctx.moveTo(r.x1, r.y1);
        ctx.lineTo(r.x1 + (r.x2 - r.x1) * localScale, r.y1 + (r.y2 - r.y1) * localScale);
        ctx.stroke();
      });

      ctx.save();
      ctx.translate(742, 505);
      ctx.rotate(-2.15);
      roundRectPath(ctx, -26, -22, 52, 48, 10);
      ctx.fillStyle = '#0F1418';
      ctx.fill();
      ctx.strokeStyle = '#9CEAE2';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-20, -22);
      ctx.lineTo(-36, -54);
      ctx.lineTo(36, -54);
      ctx.lineTo(20, -22);
      ctx.closePath();
      ctx.fillStyle = '#0F1418';
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#0F1418';
      ctx.font = '800 32px "Poppins", "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RIM 25%', 755, 452);
      ctx.restore();
    }

    // 9. CAMERA (Bottom Center at x=546, y=955)
    ctx.save();
    ctx.translate(546, 955);

    roundRectPath(ctx, -24, -88, 48, 86, 6);
    ctx.fillStyle = '#0F1418';
    ctx.fill();

    roundRectPath(ctx, -28, -94, 56, 12, 4);
    ctx.fillStyle = '#0F1418';
    ctx.fill();
    ctx.strokeStyle = '#9CEAE2';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.strokeStyle = '#8CE8E0';
    ctx.lineWidth = 3;
    for (let ry = -76; ry <= -22; ry += 9) {
      ctx.beginPath();
      ctx.moveTo(-20, ry);
      ctx.lineTo(20, ry);
      ctx.stroke();
    }

    roundRectPath(ctx, -38, -6, 108, 66, 12);
    ctx.fillStyle = '#0F1418';
    ctx.fill();

    ctx.strokeStyle = '#8CE8E0';
    ctx.lineWidth = 3;
    roundRectPath(ctx, -30, 4, 56, 46, 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(44, 28, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#8CE8E0';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(44, 28, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#0F1418';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(44, 6, 4.5 + pulse * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FE2C55';
    ctx.fill();

    roundRectPath(ctx, -18, 60, 36, 12, 4);
    ctx.fillStyle = '#0F1418';
    ctx.fill();
    ctx.restore();

    if (beatIndex >= 2) {
      drawBadgeTag(ctx, 546, 1082, 'AE/AF LOCKED ✓', '#0F1418', '#FFE600', '#FFE600');
    }

    ctx.restore();
  }

  /**
   * EPISODE 2: 8% Open vs. 22% Target Links, Agency Split Trap & 365-Day Spark Ads
   */
  function drawMonetizationDiagram(ctx, beatIndex, beatProgress, timeSec) {
    const pulse = 0.5 + 0.5 * Math.sin(timeSec * 5.0);
    ctx.save();

    // White Studio Card Canvas
    roundRectPath(ctx, 210, 390, 660, 660, 28);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#0F1418';
    ctx.lineWidth = 4;
    ctx.stroke();

    if (beatIndex === 0 || beatIndex === 2) {
      // Contract Split & 90-Day Lock Inspector
      drawBadgeTag(ctx, 540, 465, 'INBOX AGENCY CONTRACT AUDIT', '#0F1418', '#9CEAE2', null);

      const rows = [
        { label: 'COMMISSION CUT', bad: '20% AGENCY CUT ✕', good: '0% PARTNER CUT ✓', highlight: true },
        { label: 'CONTRACT LOCK', bad: '90-DAY AUTO-LOCK ✕', good: '14-DAY UNBIND ✓', highlight: beatIndex === 2 }
      ];

      rows.forEach((r, idx) => {
        const y = 590 + idx * 185;
        roundRectPath(ctx, 250, y - 65, 580, 140, 18);
        ctx.fillStyle = '#0F1418';
        ctx.fill();

        ctx.fillStyle = '#9CEAE2';
        ctx.font = '800 22px "Poppins", "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(r.label, 540, y - 28);

        // Left Bad Pill
        roundRectPath(ctx, 272, y - 6, 255, 54, 12);
        ctx.fillStyle = '#2B080C';
        ctx.fill();
        ctx.strokeStyle = '#FF3355';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = '#FF3355';
        ctx.font = '800 21px "Poppins", "Segoe UI", Arial, sans-serif';
        ctx.fillText(r.bad, 399, y + 22);

        // Right Good Pill
        roundRectPath(ctx, 552, y - 6, 255, 54, 12);
        ctx.fillStyle = '#125E63';
        ctx.fill();
        ctx.strokeStyle = '#FFE600';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = '#FFE600';
        ctx.fillText(r.good, 679, y + 22);
      });
    } else if (beatIndex === 1) {
      // 8% Open Collaboration vs 22% Target Collaboration Bar Chart
      drawBadgeTag(ctx, 540, 460, 'SAME SKU • TWO DIFFERENT LINKS', '#0F1418', '#FFE600', null);

      // Left Bar: 8% Open Link
      roundRectPath(ctx, 300, 740, 180, 180, 16);
      ctx.fillStyle = '#0F1418';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 44px "Poppins", "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('8%', 390, 825);
      ctx.font = '700 22px "Poppins", "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#9CEAE2';
      ctx.fillText('OPEN LINK', 390, 865);

      // Right Bar: 22% Target Link (Tall Crimson Bar + Red Rays)
      roundRectPath(ctx, 580, 545, 200, 375, 18);
      ctx.fillStyle = '#E11937';
      ctx.fill();
      ctx.strokeStyle = '#0F1418';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#FFE600';
      ctx.font = '800 56px "Poppins", "Segoe UI", Arial, sans-serif';
      ctx.fillText('22%', 680, 695);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 24px "Poppins", "Segoe UI", Arial, sans-serif';
      ctx.fillText('TARGET LINK', 680, 745);
      ctx.fillText('(2.7× PAYOUT)', 680, 780);
    } else {
      // Beat 3 & 4: Commercial Music Toggle + 365-Day Spark Code Flow
      drawBadgeTag(ctx, 540, 460, 'SPARK ADS AUTHORIZATION FLOW', '#0F1418', '#FFE600', null);

      const steps = [
        { y: 575, title: '1. COMMERCIAL MUSIC LIBRARY: ON ✓', active: beatIndex === 3 },
        { y: 715, title: '2. GENERATE 365-DAY SPARK CODE ✓', active: beatIndex === 4 },
        { y: 855, title: '3. BRAND FUNDS ADS • YOU KEEP 100%', active: beatIndex === 4 }
      ];

      steps.forEach((st) => {
        roundRectPath(ctx, 260, st.y - 48, 560, 96, 18);
        ctx.fillStyle = st.active ? '#E11937' : '#0F1418';
        ctx.fill();
        ctx.fillStyle = st.active ? '#FFE600' : '#FFFFFF';
        ctx.font = '800 25px "Poppins", "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(st.title, 540, st.y + 8);
      });
    }

    ctx.restore();
  }

  /**
   * EPISODE 3: Seller Center Sales Accelerator & Data Compass Funnel (Brand Coaching)
   */
  function drawAcceleratorDiagram(ctx, beatIndex, beatProgress, timeSec) {
    ctx.save();
    roundRectPath(ctx, 210, 390, 660, 660, 28);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#0F1418';
    ctx.lineWidth = 4;
    ctx.stroke();

    const headers = [
      'SELLER CENTER > SALES ACCELERATOR',
      '3 SKU DISQUALIFICATION TRIGGERS',
      'DATA COMPASS: FIX CTR < 4.0%',
      'LISTING CONVERSION: CTOR > 8.0%',
      'DUAL AFFILIATE COMMISSION ENGINE'
    ];
    drawBadgeTag(ctx, 540, 455, headers[beatIndex] || headers[0], '#0F1418', '#FFE600', null);

    const cards = [
      { y: 565, label: 'SAFETY STOCK >= 20 UNITS + ATTRIBUTES', tag: 'QUALIFIED ✓', active: beatIndex <= 1 },
      { y: 700, label: 'FIRST 35 CHARS = BUYER SEARCH KEYWORD', tag: 'CTR 4.5%+', active: beatIndex === 2 },
      { y: 835, label: '9:16 HEADER DEMO + 5 CONTRAST CARDS', tag: 'CTOR 8.2%+', active: beatIndex === 3 },
      { y: 960, label: '12% OPEN VOLUME + 22% TARGET (48H SLA)', tag: 'SCALE ✓', active: beatIndex === 4 }
    ];

    cards.forEach((c) => {
      roundRectPath(ctx, 245, c.y - 46, 590, 92, 16);
      ctx.fillStyle = c.active ? '#E11937' : '#0F1418';
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 21px "Poppins", "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(c.label, 270, c.y + 7);

      roundRectPath(ctx, 685, c.y - 26, 130, 52, 10);
      ctx.fillStyle = c.active ? '#2B080C' : '#125E63';
      ctx.fill();
      ctx.fillStyle = '#FFE600';
      ctx.font = '800 18px "Poppins", "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.tag, 750, c.y + 6);
    });

    ctx.restore();
  }

  /**
   * EPISODE 4: LIVE Console 100-SKU Bag, 5-Min Re-Pin & <5 Unit Scarcity Trigger
   */
  function drawLiveDiagram(ctx, beatIndex, beatProgress, timeSec) {
    ctx.save();
    roundRectPath(ctx, 210, 390, 660, 660, 28);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#0F1418';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Left: 9:16 Vertical LIVE Phone Safe Zone Diagram
    roundRectPath(ctx, 245, 435, 260, 565, 28);
    ctx.fillStyle = '#0F1418';
    ctx.fill();

    // Top 65% Safe Demo Zone
    roundRectPath(ctx, 260, 455, 230, 340, 16);
    ctx.fillStyle = beatIndex === 3 ? '#E11937' : '#9CEAE2';
    ctx.fill();
    ctx.fillStyle = beatIndex === 3 ? '#FFFFFF' : '#0F1418';
    ctx.font = '800 22px "Poppins", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TOP 65%', 375, 585);
    ctx.fillText('SAFE ZONE', 375, 615);
    ctx.fillText('+ CAM 2 MACRO', 375, 645);

    // Bottom 35% Comment Dead Zone + Orange Pinned Cart
    roundRectPath(ctx, 260, 805, 230, 175, 16);
    ctx.fillStyle = '#2B080C';
    ctx.fill();
    ctx.fillStyle = '#FF3355';
    ctx.font = '800 19px "Poppins", "Segoe UI", Arial, sans-serif';
    ctx.fillText('BOTTOM 35% COMMENTS', 375, 855);

    roundRectPath(ctx, 275, 895, 200, 64, 12);
    ctx.fillStyle = '#FF6B00';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 19px "Poppins", "Segoe UI", Arial, sans-serif';
    ctx.fillText('PINNED CART (3-5M)', 375, 933);

    // Right Column: Streamer Console KPIs
    const kpis = [
      { y: 495, title: 'BAG SLOTS #1–#5', sub: 'HERO TRAFFIC SKUs', active: beatIndex === 0 },
      { y: 635, title: 'RE-PIN EVERY 3–5M', sub: 'FIRES CART BANNER', active: beatIndex === 1 },
      { y: 775, title: '<5 UNITS WARNING', sub: '+BUFFER BEFORE 0', active: beatIndex === 2 },
      { y: 915, title: 'WATCH TIME < 45S', sub: '60S KEYWORD POLL', active: beatIndex === 4 }
    ];

    kpis.forEach((k) => {
      roundRectPath(ctx, 530, k.y - 52, 310, 108, 16);
      ctx.fillStyle = k.active ? '#E11937' : '#0F1418';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 22px "Poppins", "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(k.title, 685, k.y - 8);
      ctx.fillStyle = k.active ? '#FFE600' : '#9CEAE2';
      ctx.font = '700 19px "Poppins", "Segoe UI", Arial, sans-serif';
      ctx.fillText(k.sub, 685, k.y + 24);
    });

    ctx.restore();
  }

  /**
   * EPISODE 5: Shop Health Defense: AHR 200+, SPS 4.0+, 5-Handle CHR & 2-Appeal Bundle
   */
  function drawHealthDiagram(ctx, beatIndex, beatProgress, timeSec) {
    ctx.save();
    roundRectPath(ctx, 210, 390, 660, 660, 28);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#0F1418';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Top Dual Score Cards: AHR 200+ & SPS 4.0+
    roundRectPath(ctx, 245, 425, 280, 130, 18);
    ctx.fillStyle = beatIndex === 0 ? '#E11937' : '#0F1418';
    ctx.fill();
    ctx.fillStyle = '#FFE600';
    ctx.font = '800 38px "Poppins", "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AHR 200+', 385, 485);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 20px "Poppins", "Segoe UI", Arial, sans-serif';
    ctx.fillText('ACCOUNT HEALTH', 385, 525);

    roundRectPath(ctx, 555, 425, 280, 130, 18);
    ctx.fillStyle = beatIndex <= 1 ? '#E11937' : '#0F1418';
    ctx.fill();
    ctx.fillStyle = '#FFE600';
    ctx.font = '800 38px "Poppins", "Segoe UI", Arial, sans-serif';
    ctx.fillText('SPS 4.0+', 695, 485);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 20px "Poppins", "Segoe UI", Arial, sans-serif';
    ctx.fillText('SHOP PERFORMANCE', 695, 525);

    const rules = [
      { y: 635, text: 'LDR < 4% • CANCEL < 2.5% • CS < 12HR', active: beatIndex === 1 },
      { y: 745, text: 'CHR 200+ ACROSS 1 OFFICIAL + 4 MKT HANDLES', active: beatIndex === 2 },
      { y: 855, text: 'PRE-STAGE PDF: GS1 UPC + FDA/UL COA + AUTH', active: beatIndex === 3 },
      { y: 965, text: 'MAX 2 APPEALS: ATTACH FULL EVIDENCE BUNDLE', active: beatIndex === 4 }
    ];

    rules.forEach((r) => {
      roundRectPath(ctx, 245, r.y - 42, 590, 84, 15);
      ctx.fillStyle = r.active ? '#E11937' : '#0F1418';
      ctx.fill();
      ctx.fillStyle = r.active ? '#FFE600' : '#FFFFFF';
      ctx.font = '800 21px "Poppins", "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(r.text, 540, r.y + 7);
    });

    ctx.restore();
  }

  function renderIllustrationFrame(ctx, options) {
    const {
      width = 1080,
      height = 1920,
      episode = EPISODES[0],
      lineIndex = 0,
      lineProgress = 0,
      spokenWordIndex = 0,
      timeSec = 0,
      drawCaptions = true
    } = options || {};

    const scaleX = width / 1080;
    const scaleY = height / 1920;

    ctx.save();
    ctx.scale(scaleX, scaleY);

    ctx.fillStyle = '#BAF2EC';
    ctx.fillRect(0, 0, 1080, 1920);

    const safeIdx = Math.max(0, Math.min((episode.lines || []).length - 1, lineIndex));
    const currentLine = (episode.lines && episode.lines[safeIdx]) || {
      beatTitle: 'FILL LIGHT AT 35%',
      text: 'Since the fill light is dimmer than the key light, it softens harsh shadows.'
    };

    if (episode.diagramType === 'monetization') {
      drawMonetizationDiagram(ctx, safeIdx, lineProgress, timeSec);
    } else if (episode.diagramType === 'accelerator') {
      drawAcceleratorDiagram(ctx, safeIdx, lineProgress, timeSec);
    } else if (episode.diagramType === 'live') {
      drawLiveDiagram(ctx, safeIdx, lineProgress, timeSec);
    } else if (episode.diagramType === 'health') {
      drawHealthDiagram(ctx, safeIdx, lineProgress, timeSec);
    } else {
      drawLightingDiagram(ctx, safeIdx, lineProgress, timeSec);
    }

    const pillTitle = String(currentLine.beatTitle || 'FILL LIGHT').toUpperCase();
    ctx.save();
    ctx.font = '800 44px "Poppins", "Segoe UI", Arial, sans-serif';
    const textMetrics = ctx.measureText(pillTitle);
    const pillW = Math.max(360, Math.round(textMetrics.width + 84));
    const pillH = 96;
    const pillX = Math.round((1080 - pillW) / 2);
    const pillY = 1136;

    roundRectPath(ctx, pillX, pillY, pillW, pillH, 24);
    ctx.fillStyle = '#2B080C';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#521018';
    ctx.stroke();

    ctx.fillStyle = '#FF3355';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pillTitle, 540, pillY + pillH / 2 + 2);
    ctx.restore();

    if (drawCaptions && currentLine.text) {
      const { totalWords, phrases } = buildKaraokePhrases(currentLine.text);
      const activeWordIdx =
        typeof spokenWordIndex === 'number' && spokenWordIndex >= 0
          ? Math.min(totalWords - 1, spokenWordIndex)
          : Math.min(totalWords - 1, Math.floor(lineProgress * totalWords));

      let activePhrase = phrases[0];
      for (const p of phrases) {
        if (activeWordIdx >= p.startWordIdx && activeWordIdx <= p.endWordIdx) {
          activePhrase = p;
          break;
        }
      }

      if (activePhrase && activePhrase.words.length > 0) {
        ctx.save();
        ctx.font = '800 54px "Poppins", "Segoe UI", Arial, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const spaceW = ctx.measureText(' ').width * 1.12;
        const wordWidths = activePhrase.words.map((w) => ctx.measureText(w).width);
        const totalPhraseW =
          wordWidths.reduce((a, b) => a + b, 0) + spaceW * Math.max(0, activePhrase.words.length - 1);

        let curX = (1080 - totalPhraseW) / 2;
        const capY = 1445;

        activePhrase.words.forEach((word, idx) => {
          const globalWordIdx = activePhrase.startWordIdx + idx;
          const isHighlighted = globalWordIdx === activeWordIdx;

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 4;
          ctx.strokeStyle = '#0B0F14';
          ctx.lineWidth = 14;
          ctx.strokeText(word, curX, capY);
          ctx.restore();

          ctx.fillStyle = isHighlighted ? '#FFE600' : '#FFFFFF';
          ctx.fillText(word, curX, capY);

          curX += wordWidths[idx] + spaceW;
        });

        ctx.restore();
      }
    }

    ctx.restore();
  }

  return {
    EPISODES,
    buildKaraokePhrases,
    renderIllustrationFrame
  };
});
