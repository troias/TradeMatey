# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - navigation [ref=e3]:
      - link "TradeMatey Home" [ref=e4] [cursor=pointer]:
        - /url: /
        - generic [ref=e5] [cursor=pointer]: TradeMatey
      - generic [ref=e6]:
        - link "Browse Tradies" [ref=e7] [cursor=pointer]:
          - /url: /client/browse-tradies
        - link "Post a Job" [ref=e8] [cursor=pointer]:
          - /url: /client/post-job
        - link "Client Login" [ref=e9] [cursor=pointer]:
          - /url: /client/login
        - link "Tradie Login" [ref=e10] [cursor=pointer]:
          - /url: /tradie/login
  - main [ref=e11]:
    - generic [ref=e13]: Job not found
  - contentinfo [ref=e14]:
    - paragraph [ref=e16]:
      - text: © 2025 TradeMatey. All rights reserved. |
      - link "Privacy Policy" [ref=e17] [cursor=pointer]:
        - /url: /privacy-policy
      - text: "|"
      - link "Terms of Service" [ref=e18] [cursor=pointer]:
        - /url: /terms
  - generic [ref=e20]:
    - textbox "Ask a question..." [ref=e21]
    - button "Send" [ref=e22] [cursor=pointer]
  - alert [ref=e23]
```