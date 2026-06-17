# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> a11y: /login has no serious/critical violations
- Location: tests-e2e/a11y.spec.ts:25:3

# Error details

```
Error: [
  {
    "id": "color-contrast",
    "impact": "serious",
    "tags": [
      "cat.color",
      "wcag2aa",
      "wcag143",
      "TTv5",
      "TT13.c",
      "EN-301-549",
      "EN-9.1.4.3",
      "ACT",
      "RGAAv4",
      "RGAA-3.2.1"
    ],
    "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
    "help": "Elements must meet minimum color contrast ratio thresholds",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright",
    "nodes": [
      {
        "any": [
          {
            "id": "color-contrast",
            "data": {
              "fgColor": "#555f6d",
              "bgColor": "#141b1b",
              "contrastRatio": 2.69,
              "fontSize": "7.5pt (10px)",
              "fontWeight": "normal",
              "messageKey": null,
              "expectedContrastRatio": "4.5:1"
            },
            "relatedNodes": [
              {
                "html": "<div class=\"mb-6 p-3.5 border\" style=\"border-color: hsl(var(--brand)/30%); background: hsl(var(--brand)/5%); border-radius: 0px;\">",
                "target": [
                  ".p-3\\.5"
                ]
              },
              {
                "html": "<div class=\"min-h-screen flex\" style=\"background: hsl(var(--bg-page));\">",
                "target": [
                  ".min-h-screen.flex"
                ]
              }
            ],
            "impact": "serious",
            "message": "Element has insufficient color contrast of 2.69 (foreground color: #555f6d, background color: #141b1b, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<p class=\"text-[10px]\" style=\"color: hsl(var(--text-4));\">Password</p>",
        "target": [
          ".text-right > p:nth-child(1)"
        ],
        "failureSummary": "Fix any of the following:\n  Element has insufficient color contrast of 2.69 (foreground color: #555f6d, background color: #141b1b, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1"
      },
      {
        "any": [
          {
            "id": "color-contrast",
            "data": {
              "fgColor": "#555f6d",
              "bgColor": "#111317",
              "contrastRatio": 2.87,
              "fontSize": "9.0pt (12px)",
              "fontWeight": "normal",
              "messageKey": null,
              "expectedContrastRatio": "4.5:1"
            },
            "relatedNodes": [
              {
                "html": "<div class=\"min-h-screen flex\" style=\"background: hsl(var(--bg-page));\">",
                "target": [
                  ".min-h-screen.flex"
                ]
              }
            ],
            "impact": "serious",
            "message": "Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<label class=\"text-xs font-semibold uppercase tracking-wide\" style=\"color: hsl(var(--text-4));\">Work Email</label>",
        "target": [
          ".space-y-1\\.5:nth-child(1) > .tracking-wide"
        ],
        "failureSummary": "Fix any of the following:\n  Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"
      },
      {
        "any": [
          {
            "id": "color-contrast",
            "data": {
              "fgColor": "#555f6d",
              "bgColor": "#111317",
              "contrastRatio": 2.87,
              "fontSize": "9.0pt (12px)",
              "fontWeight": "normal",
              "messageKey": null,
              "expectedContrastRatio": "4.5:1"
            },
            "relatedNodes": [
              {
                "html": "<div class=\"min-h-screen flex\" style=\"background: hsl(var(--bg-page));\">",
                "target": [
                  ".min-h-screen.flex"
                ]
              }
            ],
            "impact": "serious",
            "message": "Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<label class=\"text-xs font-semibold uppercase tracking-wide\" style=\"color: hsl(var(--text-4));\">Password</label>",
        "target": [
          ".justify-between.items-center.flex > .tracking-wide"
        ],
        "failureSummary": "Fix any of the following:\n  Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"
      },
      {
        "any": [
          {
            "id": "color-contrast",
            "data": {
              "fgColor": "#ffffff",
              "bgColor": "#44bb70",
              "contrastRatio": 2.44,
              "fontSize": "10.5pt (14px)",
              "fontWeight": "normal",
              "messageKey": null,
              "expectedContrastRatio": "4.5:1"
            },
            "relatedNodes": [
              {
                "html": "<button type=\"submit\" class=\"w-full py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 mt-2\" style=\"background: hsl(var(--brand)); border-radius: 0px;\">",
                "target": [
                  ".text-white"
                ]
              }
            ],
            "impact": "serious",
            "message": "Element has insufficient color contrast of 2.44 (foreground color: #ffffff, background color: #44bb70, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<button type=\"submit\" class=\"w-full py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 mt-2\" style=\"background: hsl(var(--brand)); border-radius: 0px;\">",
        "target": [
          ".text-white"
        ],
        "failureSummary": "Fix any of the following:\n  Element has insufficient color contrast of 2.44 (foreground color: #ffffff, background color: #44bb70, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1"
      },
      {
        "any": [
          {
            "id": "color-contrast",
            "data": {
              "fgColor": "#555f6d",
              "bgColor": "#111317",
              "contrastRatio": 2.87,
              "fontSize": "9.0pt (12px)",
              "fontWeight": "normal",
              "messageKey": null,
              "expectedContrastRatio": "4.5:1"
            },
            "relatedNodes": [
              {
                "html": "<div class=\"min-h-screen flex\" style=\"background: hsl(var(--bg-page));\">",
                "target": [
                  ".min-h-screen.flex"
                ]
              }
            ],
            "impact": "serious",
            "message": "Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<span class=\"text-xs font-medium\" style=\"color: hsl(var(--text-4));\">OR CONTINUE WITH SSO</span>",
        "target": [
          ".my-6 > .font-medium.text-xs"
        ],
        "failureSummary": "Fix any of the following:\n  Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1"
      },
      {
        "any": [
          {
            "id": "color-contrast",
            "data": {
              "fgColor": "#555f6d",
              "bgColor": "#111317",
              "contrastRatio": 2.87,
              "fontSize": "8.3pt (11px)",
              "fontWeight": "normal",
              "messageKey": null,
              "expectedContrastRatio": "4.5:1"
            },
            "relatedNodes": [
              {
                "html": "<div class=\"min-h-screen flex\" style=\"background: hsl(var(--bg-page));\">",
                "target": [
                  ".min-h-screen.flex"
                ]
              }
            ],
            "impact": "serious",
            "message": "Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<p class=\"mt-6 text-center text-[11px] leading-relaxed\" style=\"color: hsl(var(--text-4));\">",
        "target": [
          ".text-\\[11px\\]"
        ],
        "failureSummary": "Fix any of the following:\n  Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1"
      }
    ]
  },
  {
    "id": "link-in-text-block",
    "impact": "serious",
    "tags": [
      "cat.color",
      "wcag2a",
      "wcag141",
      "TTv5",
      "TT13.a",
      "EN-301-549",
      "EN-9.1.4.1",
      "RGAAv4",
      "RGAA-10.6.1"
    ],
    "description": "Ensure links are distinguished from surrounding text in a way that does not rely on color",
    "help": "Links must be distinguishable without relying on color",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/link-in-text-block?application=playwright",
    "nodes": [
      {
        "any": [
          {
            "id": "link-in-text-block",
            "data": {
              "messageKey": "fgContrast",
              "contrastRatio": 2.64,
              "requiredContrastRatio": 3,
              "nodeColor": "#44bb70",
              "parentColor": "#555f6d"
            },
            "relatedNodes": [
              {
                "html": "<p class=\"mt-6 text-center text-[11px] leading-relaxed\" style=\"color: hsl(var(--text-4));\">",
                "target": [
                  ".text-\\[11px\\]"
                ]
              }
            ],
            "impact": "serious",
            "message": "The link has insufficient color contrast of 2.64:1 with the surrounding text. (Minimum contrast is 3:1, link text: #44bb70, surrounding text: #555f6d)"
          },
          {
            "id": "link-in-text-block-style",
            "data": null,
            "relatedNodes": [
              {
                "html": "<p class=\"mt-6 text-center text-[11px] leading-relaxed\" style=\"color: hsl(var(--text-4));\">",
                "target": [
                  ".text-\\[11px\\]"
                ]
              }
            ],
            "impact": "serious",
            "message": "The link has no styling (such as underline) to distinguish it from the surrounding text"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<a href=\"#\" class=\"hover:underline\" style=\"color: hsl(var(--brand));\">Terms of Service</a>",
        "target": [
          "a[href=\"#\"]:nth-child(1)"
        ],
        "failureSummary": "Fix any of the following:\n  The link has insufficient color contrast of 2.64:1 with the surrounding text. (Minimum contrast is 3:1, link text: #44bb70, surrounding text: #555f6d)\n  The link has no styling (such as underline) to distinguish it from the surrounding text"
      },
      {
        "any": [
          {
            "id": "link-in-text-block",
            "data": {
              "messageKey": "fgContrast",
              "contrastRatio": 2.64,
              "requiredContrastRatio": 3,
              "nodeColor": "#44bb70",
              "parentColor": "#555f6d"
            },
            "relatedNodes": [
              {
                "html": "<p class=\"mt-6 text-center text-[11px] leading-relaxed\" style=\"color: hsl(var(--text-4));\">",
                "target": [
                  ".text-\\[11px\\]"
                ]
              }
            ],
            "impact": "serious",
            "message": "The link has insufficient color contrast of 2.64:1 with the surrounding text. (Minimum contrast is 3:1, link text: #44bb70, surrounding text: #555f6d)"
          },
          {
            "id": "link-in-text-block-style",
            "data": null,
            "relatedNodes": [
              {
                "html": "<p class=\"mt-6 text-center text-[11px] leading-relaxed\" style=\"color: hsl(var(--text-4));\">",
                "target": [
                  ".text-\\[11px\\]"
                ]
              }
            ],
            "impact": "serious",
            "message": "The link has no styling (such as underline) to distinguish it from the surrounding text"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<a href=\"#\" class=\"hover:underline\" style=\"color: hsl(var(--brand));\">Privacy Policy</a>",
        "target": [
          "a[href=\"#\"]:nth-child(2)"
        ],
        "failureSummary": "Fix any of the following:\n  The link has insufficient color contrast of 2.64:1 with the surrounding text. (Minimum contrast is 3:1, link text: #44bb70, surrounding text: #555f6d)\n  The link has no styling (such as underline) to distinguish it from the surrounding text"
      }
    ]
  }
]

expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 355

- Array []
+ Array [
+   Object {
+     "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
+     "help": "Elements must meet minimum color contrast ratio thresholds",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright",
+     "id": "color-contrast",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#141b1b",
+               "contrastRatio": 2.69,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#555f6d",
+               "fontSize": "7.5pt (10px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.69 (foreground color: #555f6d, background color: #141b1b, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"mb-6 p-3.5 border\" style=\"border-color: hsl(var(--brand)/30%); background: hsl(var(--brand)/5%); border-radius: 0px;\">",
+                 "target": Array [
+                   ".p-3\\.5",
+                 ],
+               },
+               Object {
+                 "html": "<div class=\"min-h-screen flex\" style=\"background: hsl(var(--bg-page));\">",
+                 "target": Array [
+                   ".min-h-screen.flex",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.69 (foreground color: #555f6d, background color: #141b1b, font size: 7.5pt (10px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"text-[10px]\" style=\"color: hsl(var(--text-4));\">Password</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".text-right > p:nth-child(1)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#111317",
+               "contrastRatio": 2.87,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#555f6d",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"min-h-screen flex\" style=\"background: hsl(var(--bg-page));\">",
+                 "target": Array [
+                   ".min-h-screen.flex",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<label class=\"text-xs font-semibold uppercase tracking-wide\" style=\"color: hsl(var(--text-4));\">Work Email</label>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".space-y-1\\.5:nth-child(1) > .tracking-wide",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#111317",
+               "contrastRatio": 2.87,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#555f6d",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"min-h-screen flex\" style=\"background: hsl(var(--bg-page));\">",
+                 "target": Array [
+                   ".min-h-screen.flex",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<label class=\"text-xs font-semibold uppercase tracking-wide\" style=\"color: hsl(var(--text-4));\">Password</label>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".justify-between.items-center.flex > .tracking-wide",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#44bb70",
+               "contrastRatio": 2.44,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#ffffff",
+               "fontSize": "10.5pt (14px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.44 (foreground color: #ffffff, background color: #44bb70, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button type=\"submit\" class=\"w-full py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 mt-2\" style=\"background: hsl(var(--brand)); border-radius: 0px;\">",
+                 "target": Array [
+                   ".text-white",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.44 (foreground color: #ffffff, background color: #44bb70, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<button type=\"submit\" class=\"w-full py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 mt-2\" style=\"background: hsl(var(--brand)); border-radius: 0px;\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".text-white",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#111317",
+               "contrastRatio": 2.87,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#555f6d",
+               "fontSize": "9.0pt (12px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"min-h-screen flex\" style=\"background: hsl(var(--bg-page));\">",
+                 "target": Array [
+                   ".min-h-screen.flex",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"text-xs font-medium\" style=\"color: hsl(var(--text-4));\">OR CONTINUE WITH SSO</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".my-6 > .font-medium.text-xs",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#111317",
+               "contrastRatio": 2.87,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#555f6d",
+               "fontSize": "8.3pt (11px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"min-h-screen flex\" style=\"background: hsl(var(--bg-page));\">",
+                 "target": Array [
+                   ".min-h-screen.flex",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 2.87 (foreground color: #555f6d, background color: #111317, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"mt-6 text-center text-[11px] leading-relaxed\" style=\"color: hsl(var(--text-4));\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".text-\\[11px\\]",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.color",
+       "wcag2aa",
+       "wcag143",
+       "TTv5",
+       "TT13.c",
+       "EN-301-549",
+       "EN-9.1.4.3",
+       "ACT",
+       "RGAAv4",
+       "RGAA-3.2.1",
+     ],
+   },
+   Object {
+     "description": "Ensure links are distinguished from surrounding text in a way that does not rely on color",
+     "help": "Links must be distinguishable without relying on color",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.11/link-in-text-block?application=playwright",
+     "id": "link-in-text-block",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "contrastRatio": 2.64,
+               "messageKey": "fgContrast",
+               "nodeColor": "#44bb70",
+               "parentColor": "#555f6d",
+               "requiredContrastRatio": 3,
+             },
+             "id": "link-in-text-block",
+             "impact": "serious",
+             "message": "The link has insufficient color contrast of 2.64:1 with the surrounding text. (Minimum contrast is 3:1, link text: #44bb70, surrounding text: #555f6d)",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<p class=\"mt-6 text-center text-[11px] leading-relaxed\" style=\"color: hsl(var(--text-4));\">",
+                 "target": Array [
+                   ".text-\\[11px\\]",
+                 ],
+               },
+             ],
+           },
+           Object {
+             "data": null,
+             "id": "link-in-text-block-style",
+             "impact": "serious",
+             "message": "The link has no styling (such as underline) to distinguish it from the surrounding text",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<p class=\"mt-6 text-center text-[11px] leading-relaxed\" style=\"color: hsl(var(--text-4));\">",
+                 "target": Array [
+                   ".text-\\[11px\\]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   The link has insufficient color contrast of 2.64:1 with the surrounding text. (Minimum contrast is 3:1, link text: #44bb70, surrounding text: #555f6d)
+   The link has no styling (such as underline) to distinguish it from the surrounding text",
+         "html": "<a href=\"#\" class=\"hover:underline\" style=\"color: hsl(var(--brand));\">Terms of Service</a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href=\"#\"]:nth-child(1)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "contrastRatio": 2.64,
+               "messageKey": "fgContrast",
+               "nodeColor": "#44bb70",
+               "parentColor": "#555f6d",
+               "requiredContrastRatio": 3,
+             },
+             "id": "link-in-text-block",
+             "impact": "serious",
+             "message": "The link has insufficient color contrast of 2.64:1 with the surrounding text. (Minimum contrast is 3:1, link text: #44bb70, surrounding text: #555f6d)",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<p class=\"mt-6 text-center text-[11px] leading-relaxed\" style=\"color: hsl(var(--text-4));\">",
+                 "target": Array [
+                   ".text-\\[11px\\]",
+                 ],
+               },
+             ],
+           },
+           Object {
+             "data": null,
+             "id": "link-in-text-block-style",
+             "impact": "serious",
+             "message": "The link has no styling (such as underline) to distinguish it from the surrounding text",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<p class=\"mt-6 text-center text-[11px] leading-relaxed\" style=\"color: hsl(var(--text-4));\">",
+                 "target": Array [
+                   ".text-\\[11px\\]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   The link has insufficient color contrast of 2.64:1 with the surrounding text. (Minimum contrast is 3:1, link text: #44bb70, surrounding text: #555f6d)
+   The link has no styling (such as underline) to distinguish it from the surrounding text",
+         "html": "<a href=\"#\" class=\"hover:underline\" style=\"color: hsl(var(--brand));\">Privacy Policy</a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href=\"#\"]:nth-child(2)",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.color",
+       "wcag2a",
+       "wcag141",
+       "TTv5",
+       "TT13.a",
+       "EN-301-549",
+       "EN-9.1.4.1",
+       "RGAAv4",
+       "RGAA-10.6.1",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - img "Sentinel AI" [ref=e7]
        - generic [ref=e8]:
          - heading "The trust layer for production AI." [level=2] [ref=e9]:
            - text: The trust layer for
            - text: production AI.
          - paragraph [ref=e10]: Enterprise AI governance, risk and compliance — built for the teams responsible for safe, compliant AI deployment at scale.
        - list [ref=e11]:
          - listitem [ref=e12]:
            - img [ref=e13]
            - generic [ref=e15]: Real-time AI governance across all deployed models
          - listitem [ref=e16]:
            - img [ref=e17]
            - generic [ref=e19]: EU AI Act, NIST AI RMF & ISO 42001 compliance automation
          - listitem [ref=e20]:
            - img [ref=e21]
            - generic [ref=e23]: Continuous bias monitoring and drift detection
          - listitem [ref=e24]:
            - img [ref=e25]
            - generic [ref=e27]: Full audit trail with cryptographic evidence chain
        - generic [ref=e28]:
          - paragraph [ref=e29]: Regulatory Coverage
          - generic [ref=e30]:
            - generic [ref=e31]: EU AI Act
            - generic [ref=e32]: ISO 42001
            - generic [ref=e33]: NIST AI RMF
            - generic [ref=e34]: GDPR
            - generic [ref=e35]: SOC 2
      - generic [ref=e36]:
        - blockquote [ref=e37]:
          - paragraph [ref=e38]: "\"Sentinel cut our EU AI Act readiness timeline from 18 months to 6 weeks. It's the compliance backbone for every AI system we ship.\""
          - contentinfo [ref=e39]: — CISO, Fortune 500 Financial Services Firm
        - generic [ref=e40]:
          - generic [ref=e41]:
            - img [ref=e42]
            - text: SOC 2 Type II
          - generic [ref=e44]: ·
          - generic [ref=e45]:
            - img [ref=e46]
            - text: ISO 27001
          - generic [ref=e48]: ·
          - generic [ref=e49]:
            - img [ref=e50]
            - text: GDPR Compliant
    - generic [ref=e53]:
      - generic [ref=e54]:
        - heading "Sign in to your workspace" [level=1] [ref=e55]
        - paragraph [ref=e56]: Enter your credentials to continue to Sentinel AI
      - generic [ref=e58]:
        - generic [ref=e59]:
          - paragraph [ref=e60]: Demo Access
          - generic [ref=e61]:
            - button "CISO admin@sentinel-grc.com" [ref=e62] [cursor=pointer]:
              - generic [ref=e63]: CISO
              - generic [ref=e64]: admin@sentinel-grc.com
            - button "Auditor auditor@sentinel-grc.com" [ref=e65] [cursor=pointer]:
              - generic [ref=e66]: Auditor
              - generic [ref=e67]: auditor@sentinel-grc.com
        - generic [ref=e68]:
          - paragraph [ref=e69]: Password
          - paragraph [ref=e70]: Demo@12345
      - generic [ref=e71]:
        - generic [ref=e72]:
          - text: Work Email
          - textbox "you@company.com" [active] [ref=e73]
        - generic [ref=e74]:
          - generic [ref=e75]:
            - generic [ref=e76]: Password
            - link "Forgot password?" [ref=e77] [cursor=pointer]:
              - /url: /forgot-password
          - generic [ref=e78]:
            - textbox "Enter your password" [ref=e79]
            - button "Show password" [ref=e80] [cursor=pointer]:
              - img [ref=e81]
        - generic [ref=e83]:
          - checkbox "Keep me signed in for 30 days" [ref=e84]
          - generic [ref=e85] [cursor=pointer]: Keep me signed in for 30 days
        - button "Sign In" [ref=e86] [cursor=pointer]:
          - text: Sign In
          - img [ref=e87]
      - generic [ref=e91]: OR CONTINUE WITH SSO
      - generic [ref=e93]:
        - button "MS Microsoft Entra" [ref=e94] [cursor=pointer]:
          - generic [ref=e95]: MS
          - text: Microsoft Entra
        - button "OK Okta / SAML" [ref=e96] [cursor=pointer]:
          - generic [ref=e97]: OK
          - text: Okta / SAML
      - paragraph [ref=e98]:
        - text: Don't have an account?
        - link "Request access" [ref=e99] [cursor=pointer]:
          - /url: /signup
      - paragraph [ref=e100]:
        - text: By signing in you agree to our
        - link "Terms of Service" [ref=e101] [cursor=pointer]:
          - /url: "#"
        - text: and
        - link "Privacy Policy" [ref=e102] [cursor=pointer]:
          - /url: "#"
        - text: .
        - text: Protected by AES-256 encryption · SOC 2 Type II certified
  - region "Notifications alt+T"
  - status [ref=e103]
  - alert [ref=e104]
```

# Test source

```ts
  1  | // SPDX-License-Identifier: Apache-2.0
  2  | // Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
  3  | //
  4  | // WS0.10 — a11y smoke via axe-core. Walks the 10 highest-traffic
  5  | // routes and asserts zero serious/critical violations. Expand with
  6  | // per-page `.spec.ts` files as pages settle post-refactor.
  7  | 
  8  | import { test, expect } from "@playwright/test";
  9  | import AxeBuilder from "@axe-core/playwright";
  10 | 
  11 | const ROUTES = [
  12 |   "/",
  13 |   "/risk",
  14 |   "/frameworks",
  15 |   "/audit-log",
  16 |   "/vendors",
  17 |   "/incidents",
  18 |   "/privacy",
  19 |   "/settings",
  20 |   "/login",
  21 |   "/403",
  22 | ];
  23 | 
  24 | for (const path of ROUTES) {
  25 |   test(`a11y: ${path} has no serious/critical violations`, async ({ page }) => {
  26 |     await page.goto(path, { waitUntil: "networkidle" });
  27 |     const results = await new AxeBuilder({ page })
  28 |       .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
  29 |       .analyze();
  30 |     const serious = results.violations.filter(
  31 |       (v) => v.impact === "serious" || v.impact === "critical",
  32 |     );
> 33 |     expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
     |                                                       ^ Error: [
  34 |   });
  35 | }
  36 | 
```