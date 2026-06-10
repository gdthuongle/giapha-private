# Home Assistant API — Gia phả Events v2.6.3

## Endpoint

```http
GET https://YOUR_DOMAIN/api/home-assistant/events/upcoming?days=30
Authorization: Bearer <HOME_ASSISTANT_TOKEN>
```

Token được tạo tại:

```text
/dashboard/account-settings → Home Assistant API
```

## Quyền xem

- Token của admin: trả toàn bộ sự kiện sắp tới.
- Token của editor/member: chỉ trả sự kiện trong phạm vi người đó được phép xem theo `profiles.person_id`.

## Home Assistant REST sensor mẫu

```yaml
rest:
  - resource: "https://YOUR_DOMAIN/api/home-assistant/events/upcoming?days=30"
    method: GET
    headers:
      Authorization: "Bearer YOUR_TOKEN"
    scan_interval: 3600
    sensor:
      - name: "Gia phả sự kiện hôm nay"
        value_template: "{{ value_json.summary.today }}"
        json_attributes:
          - today
          - next7Days
          - next30Days
          - events
```

## Telegram notify mẫu

```yaml
alias: Gia phả - Nhắc sự kiện hôm nay
trigger:
  - platform: time
    at: "07:00:00"
condition:
  - condition: template
    value_template: "{{ states('sensor.gia_pha_su_kien_hom_nay') | int > 0 }}"
action:
  - service: notify.telegram
    data:
      message: >
        📜 Hôm nay có {{ states('sensor.gia_pha_su_kien_hom_nay') }} sự kiện gia phả.
        {% for e in state_attr('sensor.gia_pha_su_kien_hom_nay', 'today') %}
        - {{ e.message }}
        {% if e.location %}  Địa điểm: {{ e.location }}{% endif %}
        {% endfor %}
mode: single
```
