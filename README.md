# fido-mds-explorer

Online explorer for the [FIDO Metadata Service v3](https://fidoalliance.org/metadata/)

You can find the MDS change history [here](https://github.com/opotonniee/fido-mds-explorer/commits/main/js/mds.js) (older changes are [here](https://github.com/opotonniee/fido-mds-explorer/commits/main/mds.js))


## Browsing

The [home page](https://opotonniee.github.io/fido-mds-explorer/) list all the authenticators registered in MDS.

To only display authenticators with some caracteristics - such as certification level, supported FIDO protocol, or key protection type - click on the column headers and select you criteria.

Click on an authenticator name to open a page with the authenticator details.

## Querying

If you want to reference a given authenticator through a hyperlink, you can directly open the detailed authenticator page using one of the following URL query parameters:

- **aaguid**: View the authenticator with the given aaguid.

   Example: https://opotonniee.github.io/fido-mds-explorer/?aaguid=efb96b10-a9ee-4b6c-a4a9-d32125ccd4a4

- **x5c**: View the authenticator which issuer has the given signature certificate. The certificate must be base64 and URL encoded.

  Example:
https://opotonniee.github.io/fido-mds-explorer/?x5c=MIIECTCCAvGgAwIBAgIMR3MEC%2BUtMnHSFSytMA0GCSqGSIb3DQEBCwUAMGoxCzAJBgNVBAYTAkZSMQ4wDAYDVQQHDAVUb3VyczEQMA4GA1UECgwHR2VtYWx0bzE5MDcGA1UEAwwwR2VtYWx0byBCdXNpbmVzcyBTb2x1dGlvbnMgQ2VydGlmaWNhdGUgQXV0aG9yaXR5MB4XDTE5MDUwMjE0MzU1M1oXDTI5MDUwMTE0MzY1M1owTjELMAkGA1UEBhMCRlIxEzARBgNVBAoMCkdlbWFsdG8gU0ExDDAKBgNVBAsMA0RJUzEcMBoGA1UEAwwTd3d3LnRoYWxlc2dyb3VwLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAK1q3MIB0ekGBbKwZ0FWKMFom1ehsAyEL1UfGXe18ZTyhyVg%2BVchy%2FiH9o3sq0fPCkuDy29iAPjyWWOQTf7qdS1ETq8iRpKNSxxplJkVGnSzLzK%2BxCDx5M4daHJLp88W2JO8HL0Wci8JroNm3Uz7YR%2Bz4UU0apzObdd2lRwEE0mp1TDFJ0jxT%2BxahlzZAldf92%2F%2FsWddoYRrTodc%2FjdefEX9bmgwHNTt3zHBJoP88yoQ12nUKHes3N2%2FqQx3HjA2%2BySFfmdYAqerDej52orvA1V%2FQpd87PV9DBNI0t9tB01t%2B6PbuPojfeqSlNBm1kTqKyU9OKmVw8BwQEXQKmT%2Bt0sCAwEAAaOByjCBxzASBgNVHRMBAf8ECDAGAQH%2FAgEAMB0GA1UdDgQWBBQvMq30QjeHLOzWmDi53KEOg86GjDAfBgNVHSMEGDAWgBR3VfWnLWVDUohSlYrzg23yYaA2bjAOBgNVHQ8BAf8EBAMCAQYwYQYDVR0fBFowWDBWoFSgUoZQaHR0cDovL2NybC1icGtpLmdlbWFsdG8uY29tL0NSTC9HZW1hbHRvQnVzaW5lc3NTb2x1dGlvbnNDZXJ0aWZpY2F0ZUF1dGhvcml0eS5jcmwwDQYJKoZIhvcNAQELBQADggEBAHckIlQopNiBCD6mMSiEg07taoZZNVPLKASv54ZqXofxhIdoqlqts%2FW5NYJ6T%2B%2FFwhn7mSebCKnwuUhaqByVkVt7kheBIw%2FF6aPaAdU8YIcuL8bkvGPvt5oQmU99buUV1pTbrEedU1RYlWLe4Etn6LSiEyKKpsDoBQBHWsJEjgVqHKFeRkQ%2FWgFmGc1%2BwxRyKAGFothrtraw1rerK3p%2BBNy0GRtfMN7tOnTn2giOvtOtebMBCYzyeRl%2F9XALfUC8Mw%2BOoxvc51OE7lhe2yjuO3xF3SjE0ax%2BcWAjGQHhuIuVdfX8CVu%2FR5SG52zA9Oo4yug%2BcjKieAAEu2OPH%2BimIyM%3D
