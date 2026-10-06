export const defaultConfigs={
  "continuous": {
    "version": 3,
    "variant": "continuous",
    "seed": 1234,
    "dataOrigin": "seed",
    "options": {
      "texture": "mixed",
      "density": 3,
      "strokeWidth": 0.5,
      "patternAngle": -45,
      "dotGain": 0.05,
      "roughness": 0.15,
      "paperGrain": true,
      "fontSize": 12,
      "labels": true,
      "guides": true,
      "curve": 0.45,
      "chartHeight": 265,
      "edgeFade": 0,
      "mirror": false,
      "stageHeight": 310,
      "stageGap": 9,
      "capCurve": 12,
      "borderRadius": 0,
      "tailRatio": 0.65,
      "nodeGap": 66,
      "nodeWidth": 2.5
    },
    "data": [
      {
        "id": "visitors",
        "label": "Visitors",
        "value": 10400
      },
      {
        "id": "engaged",
        "label": "Engaged",
        "value": 6566
      },
      {
        "id": "signups",
        "label": "Signups",
        "value": 4669
      },
      {
        "id": "activated",
        "label": "Activated",
        "value": 3447
      },
      {
        "id": "converted",
        "label": "Converted",
        "value": 1263
      }
    ]
  },
  "vertical": {
    "version": 3,
    "variant": "vertical",
    "seed": 1515972923,
    "dataOrigin": "seed",
    "options": {
      "texture": "am",
      "density": 3,
      "strokeWidth": 0.5,
      "patternAngle": -45,
      "dotGain": 0.05,
      "roughness": 0.15,
      "paperGrain": true,
      "fontSize": 12,
      "labels": true,
      "guides": true,
      "curve": 0.5,
      "chartHeight": 235,
      "edgeFade": 0,
      "stageHeight": 330,
      "stageGap": 20,
      "proximityRadius": 20,
      "capCurve": 0,
      "borderRadius": 6,
      "tailRatio": 0.15,
      "nodeGap": 66,
      "nodeWidth": 2.5,
      "verticalView": "isometric",
      "isoDepth": 36,
      "isoRotation": 45,
      "verticalViews": {
        "isometric": {
          "texture": "am",
          "density": 3,
          "strokeWidth": 0.5,
          "patternAngle": -45,
          "dotGain": 0.05,
          "roughness": 0.15,
          "fontSize": 12,
          "labels": true,
          "paperGrain": true,
          "stageHeight": 330,
          "stageGap": 20,
          "proximityRadius": 20,
          "capCurve": 0,
          "borderRadius": 6,
          "tailRatio": 0.15,
          "isoDepth": 36,
          "isoRotation": 45
        },
        "flat": {
          "texture": "mixed",
          "density": 3,
          "strokeWidth": 0.5,
          "patternAngle": -45,
          "dotGain": 0.05,
          "roughness": 0.15,
          "fontSize": 12,
          "labels": true,
          "paperGrain": true,
          "stageHeight": 330,
          "stageGap": 20,
          "proximityRadius": 20,
          "capCurve": 0,
          "borderRadius": 3,
          "tailRatio": 0.15,
          "isoDepth": 36,
          "isoRotation": 45
        }
      }
    },
    "data": [
      {
        "id": "visitors",
        "label": "Visitors",
        "value": 14500
      },
      {
        "id": "engaged",
        "label": "Engaged",
        "value": 10407
      },
      {
        "id": "signups",
        "label": "Signups",
        "value": 6960
      },
      {
        "id": "activated",
        "label": "Activated",
        "value": 3676
      },
      {
        "id": "converted",
        "label": "Converted",
        "value": 1676
      }
    ]
  },
  "branching": {
    "version": 3,
    "variant": "branching",
    "seed": 1234,
    "dataOrigin": "seed",
    "options": {
      "texture": "mixed",
      "density": 3,
      "strokeWidth": 0.4,
      "patternAngle": -25,
      "dotGain": 0.05,
      "roughness": 0.1,
      "paperGrain": true,
      "fontSize": 12,
      "labels": true,
      "guides": true,
      "curve": 0.45,
      "chartHeight": 235,
      "edgeFade": 0,
      "stageHeight": 310,
      "stageGap": 9,
      "capCurve": 12,
      "borderRadius": 0,
      "tailRatio": 0.65,
      "nodeGap": 72,
      "nodeWidth": 1
    },
    "data": {
      "nodes": [
        {
          "id": "visitors",
          "label": "Visitors",
          "value": 10400
        },
        {
          "id": "organic",
          "label": "Organic"
        },
        {
          "id": "paid",
          "label": "Paid"
        },
        {
          "id": "organic-signup",
          "label": "Signups · Organic"
        },
        {
          "id": "organic-exit",
          "label": "Drop-off · Organic"
        },
        {
          "id": "organic-active",
          "label": "Activated · Organic"
        },
        {
          "id": "organic-inactive",
          "label": "Inactive · Organic"
        },
        {
          "id": "paid-signup",
          "label": "Signups · Paid"
        },
        {
          "id": "paid-exit",
          "label": "Drop-off · Paid"
        },
        {
          "id": "paid-active",
          "label": "Activated · Paid"
        },
        {
          "id": "paid-inactive",
          "label": "Inactive · Paid"
        }
      ],
      "links": [
        {
          "source": "visitors",
          "target": "organic",
          "value": 6875
        },
        {
          "source": "visitors",
          "target": "paid",
          "value": 3525
        },
        {
          "source": "organic",
          "target": "organic-signup",
          "value": 2789
        },
        {
          "source": "organic",
          "target": "organic-exit",
          "value": 4086
        },
        {
          "source": "paid",
          "target": "paid-signup",
          "value": 1490
        },
        {
          "source": "paid",
          "target": "paid-exit",
          "value": 2035
        },
        {
          "source": "organic-signup",
          "target": "organic-active",
          "value": 1156
        },
        {
          "source": "organic-signup",
          "target": "organic-inactive",
          "value": 1633
        },
        {
          "source": "paid-signup",
          "target": "paid-active",
          "value": 617
        },
        {
          "source": "paid-signup",
          "target": "paid-inactive",
          "value": 873
        }
      ]
    }
  }
};
