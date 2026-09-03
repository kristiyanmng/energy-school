UPDATE users
SET password_hash = 'pbkdf2_sha256$10000$SqEBRRiCwmJ6IGtsd6T+Dg==$Fal7d0PfO4DW3QgfKfbcIu+QT/ZqfzU1Z3iQervO5bg='
WHERE username = 'student' AND school_id = 1;

UPDATE users
SET password_hash = 'pbkdf2_sha256$10000$0i5rT3lvBfYHDQQ+Js/kHw==$NUpxO9dMdGwgg/9D4olq7zO8N/yMjj/fHmwE3AuX8C0='
WHERE username = 'teacher' AND school_id = 1;

UPDATE users
SET password_hash = 'pbkdf2_sha256$10000$7s283LpHIqE7hAUjrZiNrg==$tTpViVBJOpc0SoZZbtWSW3iQu2llD6IiPnj6i+oFFq0='
WHERE username = 'director' AND school_id = 1;

SELECT username, role, status
FROM users
WHERE school_id = 1
ORDER BY id;
