"""
Portainer API Client
Handles authentication and API calls to Portainer
"""

import httpx
import os
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone


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
        self.client = httpx.AsyncClient(
            verify=False,
            timeout=30.0,
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

        Args:
            template_id: ID of the template

        Returns:
            dict: Template details including variables
        """
        response = await self.client.get(f"{self.base_url}/custom_templates/{template_id}")
        response.raise_for_status()
        return response.json()

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
        # First, get the template to get its content
        template = await self.get_custom_template(template_id)

        # Prepare the deployment payload
        payload = {
            "name": name,
            "stackFileContent": template.get("FileContent", ""),
            "env": env_vars or [],
        }

        # Deploy based on template type
        if template.get("Type") == 1:  # Docker Swarm
            url = f"{self.base_url}/stacks?type=1&method=string&endpointId={endpoint_id}"
        else:  # Docker Compose (type 2)
            url = f"{self.base_url}/stacks?type=2&method=string&endpointId={endpoint_id}"

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
