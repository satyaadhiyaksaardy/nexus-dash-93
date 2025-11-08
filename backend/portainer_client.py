"""
Portainer API Client
Handles authentication and API calls to Portainer
"""

import httpx
from typing import List, Dict, Optional, Any


class PortainerClient:
    """Client for interacting with Portainer API"""

    def __init__(self, url: str, api_key: str):
        """
        Initialize Portainer client

        Args:
            url: Portainer server URL (e.g., https://portainer.example.com:9443)
            api_key: API access token (ptr_xxxxx)
        """
        self.url = url.rstrip('/')
        self.api_key = api_key
        self.base_url = f"{self.url}/api"

        # Create httpx client with SSL verification disabled for self-signed certs
        # Timeout set to 10 minutes for large image pulls during deployment
        self.client = httpx.AsyncClient(
            verify=False,
            timeout=600.0,  # 10 minutes for image pulls
            headers={
                "X-API-Key": self.api_key,
                "Content-Type": "application/json"
            }
        )

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

    async def get_status(self) -> Dict[str, Any]:
        """
        Get Portainer server status

        Returns:
            dict: Server status information
        """
        response = await self.client.get(f"{self.base_url}/status")
        response.raise_for_status()
        return response.json()

    async def get_endpoints(self) -> List[Dict[str, Any]]:
        """
        Get all Portainer endpoints (environments/servers)

        Returns:
            list: List of endpoint objects
        """
        response = await self.client.get(f"{self.base_url}/endpoints")
        response.raise_for_status()
        return response.json()

    async def get_endpoint(self, endpoint_id: int) -> Dict[str, Any]:
        """
        Get specific endpoint details

        Args:
            endpoint_id: ID of the endpoint

        Returns:
            dict: Endpoint details
        """
        response = await self.client.get(f"{self.base_url}/endpoints/{endpoint_id}")
        response.raise_for_status()
        return response.json()

    async def get_custom_templates(self) -> List[Dict[str, Any]]:
        """
        Get all custom templates

        Returns:
            list: List of custom template objects
        """
        response = await self.client.get(f"{self.base_url}/custom_templates")
        response.raise_for_status()
        return response.json()

    async def get_custom_template(self, template_id: int) -> Dict[str, Any]:
        """
        Get specific custom template details
        Enriches template with variables from App Template format if present

        Args:
            template_id: ID of the template

        Returns:
            dict: Template details including variables
        """
        import json

        response = await self.client.get(f"{self.base_url}/custom_templates/{template_id}")
        response.raise_for_status()
        template = response.json()

        # Try to parse file content for App Template format variables
        try:
            file_response = await self.client.get(f"{self.base_url}/custom_templates/{template_id}/file")
            file_response.raise_for_status()
            file_data = file_response.json()
            file_content = file_data.get("FileContent", "")

            # Parse as App Template JSON
            parsed = json.loads(file_content)
            if isinstance(parsed, list) and len(parsed) > 0:
                app_template = parsed[0]
                if "env" in app_template and isinstance(app_template["env"], list):
                    # Convert App Template env format to Portainer Variables format
                    variables = []
                    for env_var in app_template["env"]:
                        var = {
                            "name": env_var.get("name", ""),
                            "label": env_var.get("label", env_var.get("name", "")),
                            "description": env_var.get("description", ""),
                            "default": env_var.get("default", "")
                        }
                        # Add select options if present
                        if "select" in env_var:
                            var["select"] = env_var["select"]
                        variables.append(var)

                    # Replace empty Variables array with parsed variables
                    template["Variables"] = variables
        except Exception:
            # If parsing fails, keep original template unchanged
            pass

        return template

    async def get_custom_template_file(self, template_id: int) -> str:
        """
        Get custom template file content
        Handles both plain docker-compose.yml and App Template JSON format

        Args:
            template_id: ID of the template

        Returns:
            str: File content of the template (docker-compose.yml)
        """
        import json

        response = await self.client.get(f"{self.base_url}/custom_templates/{template_id}/file")
        response.raise_for_status()
        data = response.json()
        file_content = data.get("FileContent", "")

        # Try to parse as App Template JSON format
        try:
            parsed = json.loads(file_content)
            if isinstance(parsed, list) and len(parsed) > 0:
                # App Template format: extract stackfile from repository
                template_data = parsed[0]
                if "repository" in template_data and "stackfile" in template_data["repository"]:
                    return template_data["repository"]["stackfile"]
        except (json.JSONDecodeError, KeyError, IndexError):
            # Not App Template format, return as-is (plain docker-compose.yml)
            pass

        return file_content

    async def get_stacks(self) -> List[Dict[str, Any]]:
        """
        Get all stacks across all endpoints

        Returns:
            list: List of stack objects
        """
        response = await self.client.get(f"{self.base_url}/stacks")
        response.raise_for_status()
        return response.json()

    async def get_stack(self, stack_id: int) -> Dict[str, Any]:
        """
        Get specific stack details

        Args:
            stack_id: ID of the stack

        Returns:
            dict: Stack details
        """
        response = await self.client.get(f"{self.base_url}/stacks/{stack_id}")
        response.raise_for_status()
        return response.json()

    async def deploy_stack_from_template(
        self,
        name: str,
        template_id: int,
        endpoint_id: int,
        env_vars: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Deploy a stack from a custom template

        Args:
            name: Name for the deployed stack
            template_id: ID of the custom template to deploy
            endpoint_id: ID of the endpoint to deploy to
            env_vars: List of environment variables [{"name": "KEY", "value": "val"}]

        Returns:
            dict: Created stack details
        """
        # Get the template file content
        file_content = await self.get_custom_template_file(template_id)

        # Get endpoint details to check if it's Swarm
        endpoint = await self.get_endpoint(endpoint_id)
        is_swarm = endpoint.get("Snapshots", [{}])[0].get("Swarm", False) if endpoint.get("Snapshots") else False

        # Prepare environment variables in correct format and perform variable substitution
        env_list = []
        if env_vars:
            for env_var in env_vars:
                if isinstance(env_var, dict) and "name" in env_var and "value" in env_var:
                    env_list.append({"name": env_var["name"], "value": env_var["value"]})
                    # Replace {{VARIABLE_NAME}} placeholders in file content
                    placeholder = "{{" + env_var["name"] + "}}"
                    file_content = file_content.replace(placeholder, env_var["value"])

        # Prepare the deployment payload
        payload = {
            "name": name,
            "stackFileContent": file_content,
            "env": env_list,
        }

        # Deploy based on whether endpoint is Swarm or standalone Docker
        if is_swarm:
            url = f"{self.base_url}/stacks/create/swarm/string?endpointId={endpoint_id}"
        else:
            url = f"{self.base_url}/stacks/create/standalone/string?endpointId={endpoint_id}"

        response = await self.client.post(url, json=payload)
        response.raise_for_status()
        return response.json()

    async def delete_stack(self, stack_id: int, endpoint_id: int) -> bool:
        """
        Delete a stack

        Args:
            stack_id: ID of the stack to delete
            endpoint_id: ID of the endpoint the stack is on

        Returns:
            bool: True if successful
        """
        response = await self.client.delete(
            f"{self.base_url}/stacks/{stack_id}?endpointId={endpoint_id}"
        )
        response.raise_for_status()
        return True

    async def get_endpoint_containers(self, endpoint_id: int) -> List[Dict[str, Any]]:
        """
        Get all containers on a specific endpoint

        Args:
            endpoint_id: ID of the endpoint

        Returns:
            list: List of container objects
        """
        response = await self.client.get(
            f"{self.base_url}/endpoints/{endpoint_id}/docker/containers/json?all=true"
        )
        response.raise_for_status()
        return response.json()

    async def health_check(self) -> bool:
        """
        Check if Portainer API is accessible

        Returns:
            bool: True if accessible, False otherwise
        """
        try:
            await self.get_status()
            return True
        except Exception:
            return False


# Singleton instance
_portainer_client: Optional[PortainerClient] = None


def get_portainer_client() -> Optional[PortainerClient]:
    """Get the global Portainer client instance"""
    return _portainer_client


def init_portainer_client(url: str, api_key: str) -> PortainerClient:
    """
    Initialize the global Portainer client

    Args:
        url: Portainer server URL
        api_key: API access token

    Returns:
        PortainerClient: Initialized client
    """
    global _portainer_client
    _portainer_client = PortainerClient(url, api_key)
    return _portainer_client
