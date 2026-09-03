import json
import os

collection = {
    "info": {
        "name": "ITBIS API Automated Test Suite",
        "description": "Comprehensive automated test suite for ITBIS Backend APIs (Auth, Admin, Employees, Departments, Logs, Reports, Alerts).",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [
        {
            "name": "01 Health & Root",
            "item": [
                {
                    "name": "Health Check - GET /",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Status message matches', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.status).to.eql('ITBIS backend is running');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {
                            "raw": "{{base_url}}/",
                            "host": ["{{base_url}}"],
                            "path": [""]
                        }
                    }
                }
            ]
        },
        {
            "name": "02 Authentication",
            "item": [
                {
                    "name": "Signup - Admin User",
                    "event": [
                        {
                            "listen": "prerequest",
                            "script": {
                                "exec": [
                                    "var rand = Math.floor(Math.random() * 1000000);",
                                    "pm.environment.set('admin_email', 'admin_' + rand + '@company.com');",
                                    "pm.environment.set('admin_pwd', 'AdminPass123!');"
                                ],
                                "type": "text/javascript"
                            }
                        },
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 201 Created', function () {",
                                    "    pm.response.to.have.status(201);",
                                    "});",
                                    "pm.test('Returns user_id and role admin', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.role).to.eql('admin');",
                                    "    pm.expect(jsonData.user_id).to.be.a('number');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"email\": \"{{admin_email}}\",\n    \"password\": \"{{admin_pwd}}\",\n    \"role\": \"admin\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/auth/signup", "host": ["{{base_url}}"], "path": ["auth", "signup"]}
                    }
                },
                {
                    "name": "Login - Admin User",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Returns valid JWT bearer access_token', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.access_token).to.be.a('string');",
                                    "    pm.expect(jsonData.token_type).to.eql('bearer');",
                                    "    pm.expect(jsonData.role).to.eql('admin');",
                                    "    pm.environment.set('admin_token', jsonData.access_token);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"email\": \"{{admin_email}}\",\n    \"password\": \"{{admin_pwd}}\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/auth/login", "host": ["{{base_url}}"], "path": ["auth", "login"]}
                    }
                },
                {
                    "name": "Signup - Security Manager User",
                    "event": [
                        {
                            "listen": "prerequest",
                            "script": {
                                "exec": [
                                    "var rand = Math.floor(Math.random() * 1000000);",
                                    "pm.environment.set('manager_email', 'manager_' + rand + '@company.com');",
                                    "pm.environment.set('manager_pwd', 'MgrPass123!');"
                                ],
                                "type": "text/javascript"
                            }
                        },
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 201 Created', function () {",
                                    "    pm.response.to.have.status(201);",
                                    "});",
                                    "pm.test('Returns role security_manager', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.role).to.eql('security_manager');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"email\": \"{{manager_email}}\",\n    \"password\": \"{{manager_pwd}}\",\n    \"role\": \"security_manager\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/auth/signup", "host": ["{{base_url}}"], "path": ["auth", "signup"]}
                    }
                },
                {
                    "name": "Login - Security Manager User",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Captures manager_token', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.access_token).to.be.a('string');",
                                    "    pm.environment.set('manager_token', jsonData.access_token);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"email\": \"{{manager_email}}\",\n    \"password\": \"{{manager_pwd}}\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/auth/login", "host": ["{{base_url}}"], "path": ["auth", "login"]}
                    }
                },
                {
                    "name": "Signup - SOC Engineer User",
                    "event": [
                        {
                            "listen": "prerequest",
                            "script": {
                                "exec": [
                                    "var rand = Math.floor(Math.random() * 1000000);",
                                    "pm.environment.set('soc_email', 'soc_' + rand + '@company.com');",
                                    "pm.environment.set('soc_pwd', 'SocPass123!');"
                                ],
                                "type": "text/javascript"
                            }
                        },
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 201 Created', function () {",
                                    "    pm.response.to.have.status(201);",
                                    "});",
                                    "pm.test('Returns role soc_engineer', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.role).to.eql('soc_engineer');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"email\": \"{{soc_email}}\",\n    \"password\": \"{{soc_pwd}}\",\n    \"role\": \"soc_engineer\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/auth/signup", "host": ["{{base_url}}"], "path": ["auth", "signup"]}
                    }
                },
                {
                    "name": "Login - SOC Engineer User",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Captures soc_token', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.access_token).to.be.a('string');",
                                    "    pm.environment.set('soc_token', jsonData.access_token);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"email\": \"{{soc_email}}\",\n    \"password\": \"{{soc_pwd}}\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/auth/login", "host": ["{{base_url}}"], "path": ["auth", "login"]}
                    }
                },
                {
                    "name": "Signup - Security Analyst User",
                    "event": [
                        {
                            "listen": "prerequest",
                            "script": {
                                "exec": [
                                    "var rand = Math.floor(Math.random() * 1000000);",
                                    "pm.environment.set('analyst_email', 'analyst_' + rand + '@company.com');",
                                    "pm.environment.set('analyst_pwd', 'AnalystPass123!');"
                                ],
                                "type": "text/javascript"
                            }
                        },
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 201 Created', function () {",
                                    "    pm.response.to.have.status(201);",
                                    "});",
                                    "pm.test('Returns role security_analyst', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.role).to.eql('security_analyst');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"email\": \"{{analyst_email}}\",\n    \"password\": \"{{analyst_pwd}}\",\n    \"role\": \"security_analyst\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/auth/signup", "host": ["{{base_url}}"], "path": ["auth", "signup"]}
                    }
                },
                {
                    "name": "Login - Security Analyst User",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Captures analyst_token', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.access_token).to.be.a('string');",
                                    "    pm.environment.set('analyst_token', jsonData.access_token);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"email\": \"{{analyst_email}}\",\n    \"password\": \"{{analyst_pwd}}\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/auth/login", "host": ["{{base_url}}"], "path": ["auth", "login"]}
                    }
                },
                {
                    "name": "Login - Invalid Credentials (Negative Test)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 401 Unauthorized', function () {",
                                    "    pm.response.to.have.status(401);",
                                    "});",
                                    "pm.test('Error detail is Invalid email or password', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.detail).to.eql('Invalid email or password');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"email\": \"nonexistent_user@company.com\",\n    \"password\": \"WrongPassword123!\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/auth/login", "host": ["{{base_url}}"], "path": ["auth", "login"]}
                    }
                },
                {
                    "name": "Signup - Duplicate Email (Negative Test)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 400 Bad Request', function () {",
                                    "    pm.response.to.have.status(400);",
                                    "});",
                                    "pm.test('Error message is Email already registered', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.detail).to.eql('Email already registered');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"email\": \"{{admin_email}}\",\n    \"password\": \"AnotherPass123!\",\n    \"role\": \"admin\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/auth/signup", "host": ["{{base_url}}"], "path": ["auth", "signup"]}
                    }
                },
                {
                    "name": "Signup - Invalid Role (Negative Test)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 422 Unprocessable Entity', function () {",
                                    "    pm.response.to.have.status(422);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [{"key": "Content-Type", "value": "application/json"}],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"email\": \"invalid_role@company.com\",\n    \"password\": \"Pass123!\",\n    \"role\": \"unauthorized_role\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/auth/signup", "host": ["{{base_url}}"], "path": ["auth", "signup"]}
                    }
                }
            ]
        },
        {
            "name": "03 Admin Endpoints",
            "item": [
                {
                    "name": "GET /admin/users (Admin Access)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Returns message', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.message).to.eql('List of all platform users');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [{"key": "Authorization", "value": "Bearer {{admin_token}}"}],
                        "url": {"raw": "{{base_url}}/admin/users", "host": ["{{base_url}}"], "path": ["admin", "users"]}
                    }
                },
                {
                    "name": "GET /admin/users (Analyst Access Forbidden - RBAC)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 403 Forbidden', function () {",
                                    "    pm.response.to.have.status(403);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [{"key": "Authorization", "value": "Bearer {{analyst_token}}"}],
                        "url": {"raw": "{{base_url}}/admin/users", "host": ["{{base_url}}"], "path": ["admin", "users"]}
                    }
                },
                {
                    "name": "GET /admin/users (No Auth - 401)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 401 Unauthorized', function () {",
                                    "    pm.response.to.have.status(401);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {"raw": "{{base_url}}/admin/users", "host": ["{{base_url}}"], "path": ["admin", "users"]}
                    }
                }
            ]
        },
        {
            "name": "04 Employee Management",
            "item": [
                {
                    "name": "POST /employees (Create Manager Employee)",
                    "event": [
                        {
                            "listen": "prerequest",
                            "script": {
                                "exec": [
                                    "var rand = Math.floor(Math.random() * 1000000);",
                                    "pm.environment.set('test_mgr_emp_id', 'EMP_MGR_' + rand);"
                                ],
                                "type": "text/javascript"
                            }
                        },
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 201 Created', function () {",
                                    "    pm.response.to.have.status(201);",
                                    "});",
                                    "pm.test('Created employee data matches', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.employee_id).to.eql(pm.environment.get('test_mgr_emp_id'));",
                                    "    pm.expect(jsonData.department).to.eql('Finance');",
                                    "    pm.environment.set('test_mgr_db_id', jsonData.id);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [
                            {"key": "Content-Type", "value": "application/json"},
                            {"key": "Authorization", "value": "Bearer {{admin_token}}"}
                        ],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"employee_id\": \"{{test_mgr_emp_id}}\",\n    \"name\": \"Test Manager Lead\",\n    \"department\": \"Finance\",\n    \"designation\": \"Finance Manager\",\n    \"manager_id\": null,\n    \"device_info\": \"Dell Latitude 7420\",\n    \"access_privileges\": \"finance_admin\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/employees/", "host": ["{{base_url}}"], "path": ["employees", ""]}
                    }
                },
                {
                    "name": "POST /employees (Create Subordinate with Manager ID)",
                    "event": [
                        {
                            "listen": "prerequest",
                            "script": {
                                "exec": [
                                    "var rand = Math.floor(Math.random() * 1000000);",
                                    "pm.environment.set('test_sub_emp_id', 'EMP_SUB_' + rand);"
                                ],
                                "type": "text/javascript"
                            }
                        },
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 201 Created', function () {",
                                    "    pm.response.to.have.status(201);",
                                    "});",
                                    "pm.test('Subordinate links to manager', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.manager_id).to.eql(Number(pm.environment.get('test_mgr_db_id')));",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [
                            {"key": "Content-Type", "value": "application/json"},
                            {"key": "Authorization", "value": "Bearer {{manager_token}}"}
                        ],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"employee_id\": \"{{test_sub_emp_id}}\",\n    \"name\": \"Test Subordinate Analyst\",\n    \"department\": \"Finance\",\n    \"designation\": \"Junior Analyst\",\n    \"manager_id\": {{test_mgr_db_id}},\n    \"device_info\": \"ThinkPad X1\",\n    \"access_privileges\": \"finance_read\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/employees/", "host": ["{{base_url}}"], "path": ["employees", ""]}
                    }
                },
                {
                    "name": "POST /employees (Analyst Forbidden - RBAC)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 403 Forbidden', function () {",
                                    "    pm.response.to.have.status(403);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [
                            {"key": "Content-Type", "value": "application/json"},
                            {"key": "Authorization", "value": "Bearer {{analyst_token}}"}
                        ],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"employee_id\": \"EMP_FAIL_999\",\n    \"name\": \"Fail Emp\",\n    \"department\": \"IT\",\n    \"designation\": \"Tech\"\n}"
                        },
                        "url": {"raw": "{{base_url}}/employees/", "host": ["{{base_url}}"], "path": ["employees", ""]}
                    }
                },
                {
                    "name": "GET /employees (List all)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Returns list of employees', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData).to.be.an('array');",
                                    "    pm.expect(jsonData.length).to.be.above(0);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [{"key": "Authorization", "value": "Bearer {{analyst_token}}"}],
                        "url": {"raw": "{{base_url}}/employees/", "host": ["{{base_url}}"], "path": ["employees", ""]}
                    }
                },
                {
                    "name": "GET /employees?department=Finance",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('All returned employees have department Finance', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    jsonData.forEach(function(emp) {",
                                    "        pm.expect(emp.department).to.eql('Finance');",
                                    "    });",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [{"key": "Authorization", "value": "Bearer {{analyst_token}}"}],
                        "url": {
                            "raw": "{{base_url}}/employees/?department=Finance",
                            "host": ["{{base_url}}"],
                            "path": ["employees", ""],
                            "query": [{"key": "department", "value": "Finance"}]
                        }
                    }
                },
                {
                    "name": "GET /employees/{employee_id}",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Returns correct employee details', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.employee_id).to.eql(pm.environment.get('test_mgr_emp_id'));",
                                    "    pm.expect(jsonData.name).to.eql('Test Manager Lead');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [{"key": "Authorization", "value": "Bearer {{analyst_token}}"}],
                        "url": {
                            "raw": "{{base_url}}/employees/{{test_mgr_emp_id}}",
                            "host": ["{{base_url}}"],
                            "path": ["employees", "{{test_mgr_emp_id}}"]
                        }
                    }
                },
                {
                    "name": "GET /employees/{employee_id}/reports (Direct Reports)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Reports includes subordinate', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.manager).to.eql('Test Manager Lead');",
                                    "    pm.expect(jsonData.direct_reports).to.include('Test Subordinate Analyst');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [{"key": "Authorization", "value": "Bearer {{manager_token}}"}],
                        "url": {
                            "raw": "{{base_url}}/employees/{{test_mgr_emp_id}}/reports",
                            "host": ["{{base_url}}"],
                            "path": ["employees", "{{test_mgr_emp_id}}", "reports"]
                        }
                    }
                },
                {
                    "name": "PATCH /employees/{employee_id}",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Designation updated', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.designation).to.eql('Senior Finance Analyst');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "PATCH",
                        "header": [
                            {"key": "Content-Type", "value": "application/json"},
                            {"key": "Authorization", "value": "Bearer {{admin_token}}"}
                        ],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"designation\": \"Senior Finance Analyst\"\n}"
                        },
                        "url": {
                            "raw": "{{base_url}}/employees/{{test_sub_emp_id}}",
                            "host": ["{{base_url}}"],
                            "path": ["employees", "{{test_sub_emp_id}}"]
                        }
                    }
                }
            ]
        },
        {
            "name": "05 Department Endpoints",
            "item": [
                {
                    "name": "GET /departments/{department}/employees",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Returns employees of Finance department', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData).to.be.an('array');",
                                    "    pm.expect(jsonData.length).to.be.above(0);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [{"key": "Authorization", "value": "Bearer {{analyst_token}}"}],
                        "url": {
                            "raw": "{{base_url}}/departments/Finance/employees",
                            "host": ["{{base_url}}"],
                            "path": ["departments", "Finance", "employees"]
                        }
                    }
                }
            ]
        },
        {
            "name": "06 Log Ingestion & Query",
            "item": [
                {
                    "name": "POST /logs/ingest (Admin/SOC)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 201 Created', function () {",
                                    "    pm.response.to.have.status(201);",
                                    "});",
                                    "pm.test('Returns log_id', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.message).to.eql('Log ingested');",
                                    "    pm.expect(jsonData.log_id).to.be.a('string');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [
                            {"key": "Content-Type", "value": "application/json"},
                            {"key": "Authorization", "value": "Bearer {{soc_token}}"}
                        ],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"employee_id\": \"{{test_mgr_emp_id}}\",\n    \"event_type\": \"login\",\n    \"details\": {\n        \"ip_address\": \"10.10.1.50\",\n        \"status\": \"success\"\n    }\n}"
                        },
                        "url": {"raw": "{{base_url}}/logs/ingest", "host": ["{{base_url}}"], "path": ["logs", "ingest"]}
                    }
                },
                {
                    "name": "POST /logs/ingest (Invalid Event Type - Negative Test)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 400 Bad Request', function () {",
                                    "    pm.response.to.have.status(400);",
                                    "});",
                                    "pm.test('Returns unknown event_type error', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.detail).to.include('Unknown event_type');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [
                            {"key": "Content-Type", "value": "application/json"},
                            {"key": "Authorization", "value": "Bearer {{soc_token}}"}
                        ],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"employee_id\": \"{{test_mgr_emp_id}}\",\n    \"event_type\": \"malicious_exploit_unsupported\",\n    \"details\": {}\n}"
                        },
                        "url": {"raw": "{{base_url}}/logs/ingest", "host": ["{{base_url}}"], "path": ["logs", "ingest"]}
                    }
                },
                {
                    "name": "POST /logs/ingest (Non-Existent Employee - Negative Test)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 404 Not Found', function () {",
                                    "    pm.response.to.have.status(404);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [
                            {"key": "Content-Type", "value": "application/json"},
                            {"key": "Authorization", "value": "Bearer {{soc_token}}"}
                        ],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"employee_id\": \"EMP_NONEXISTENT_9999\",\n    \"event_type\": \"login\",\n    \"details\": {}\n}"
                        },
                        "url": {"raw": "{{base_url}}/logs/ingest", "host": ["{{base_url}}"], "path": ["logs", "ingest"]}
                    }
                },
                {
                    "name": "POST /logs/ingest (Analyst Forbidden - RBAC)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 403 Forbidden', function () {",
                                    "    pm.response.to.have.status(403);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "POST",
                        "header": [
                            {"key": "Content-Type", "value": "application/json"},
                            {"key": "Authorization", "value": "Bearer {{analyst_token}}"}
                        ],
                        "body": {
                            "mode": "raw",
                            "raw": "{\n    \"employee_id\": \"{{test_mgr_emp_id}}\",\n    \"event_type\": \"login\",\n    \"details\": {}\n}"
                        },
                        "url": {"raw": "{{base_url}}/logs/ingest", "host": ["{{base_url}}"], "path": ["logs", "ingest"]}
                    }
                },
                {
                    "name": "GET /logs/{employee_id}",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Returns list of activity logs', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData).to.be.an('array');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [{"key": "Authorization", "value": "Bearer {{analyst_token}}"}],
                        "url": {
                            "raw": "{{base_url}}/logs/{{test_mgr_emp_id}}",
                            "host": ["{{base_url}}"],
                            "path": ["logs", "{{test_mgr_emp_id}}"]
                        }
                    }
                }
            ]
        },
        {
            "name": "07 Reports & Risk Posture",
            "item": [
                {
                    "name": "GET /reports/risk-posture (Admin Access)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Contains report message', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.message).to.eql('Organization-wide risk posture report');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [{"key": "Authorization", "value": "Bearer {{admin_token}}"}],
                        "url": {"raw": "{{base_url}}/reports/risk-posture", "host": ["{{base_url}}"], "path": ["reports", "risk-posture"]}
                    }
                },
                {
                    "name": "GET /reports/risk-posture (Manager Access)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [{"key": "Authorization", "value": "Bearer {{manager_token}}"}],
                        "url": {"raw": "{{base_url}}/reports/risk-posture", "host": ["{{base_url}}"], "path": ["reports", "risk-posture"]}
                    }
                },
                {
                    "name": "GET /reports/risk-posture (Analyst Access Forbidden - RBAC)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 403 Forbidden', function () {",
                                    "    pm.response.to.have.status(403);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [{"key": "Authorization", "value": "Bearer {{analyst_token}}"}],
                        "url": {"raw": "{{base_url}}/reports/risk-posture", "host": ["{{base_url}}"], "path": ["reports", "risk-posture"]}
                    }
                }
            ]
        },
        {
            "name": "08 Alerts",
            "item": [
                {
                    "name": "GET /alerts/my (Analyst Access)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 200 OK', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                    "pm.test('Returns user_id in alerts response', function () {",
                                    "    var jsonData = pm.response.json();",
                                    "    pm.expect(jsonData.user_id).to.be.a('string');",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [{"key": "Authorization", "value": "Bearer {{analyst_token}}"}],
                        "url": {"raw": "{{base_url}}/alerts/my", "host": ["{{base_url}}"], "path": ["alerts", "my"]}
                    }
                },
                {
                    "name": "GET /alerts/my (Unauthenticated - 401)",
                    "event": [
                        {
                            "listen": "test",
                            "script": {
                                "exec": [
                                    "pm.test('Status code is 401 Unauthorized', function () {",
                                    "    pm.response.to.have.status(401);",
                                    "});"
                                ],
                                "type": "text/javascript"
                            }
                        }
                    ],
                    "request": {
                        "method": "GET",
                        "header": [],
                        "url": {"raw": "{{base_url}}/alerts/my", "host": ["{{base_url}}"], "path": ["alerts", "my"]}
                    }
                }
            ]
        }
    ]
}

environment = {
    "name": "ITBIS Local Environment",
    "values": [
        {
            "key": "base_url",
            "value": "http://127.0.0.1:8000",
            "type": "default",
            "enabled": True
        }
    ]
}

base_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(base_dir, "itbis_api_collection.json"), "w", encoding="utf-8") as f:
    json.dump(collection, f, indent=2)

with open(os.path.join(base_dir, "itbis_api_environment.json"), "w", encoding="utf-8") as f:
    json.dump(environment, f, indent=2)

print("Generated itbis_api_collection.json and itbis_api_environment.json successfully.")
